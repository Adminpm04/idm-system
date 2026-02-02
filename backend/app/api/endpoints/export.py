from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime
from io import BytesIO

from app.db.session import get_db
from app.models import AccessRequest, User, Approval
from app.api.deps import get_current_superuser

router = APIRouter()


def get_status_label(status_value):
    """Получить русское название статуса"""
    labels = {
        'draft': 'Черновик',
        'submitted': 'Отправлена',
        'in_review': 'На рассмотрении',
        'approved': 'Одобрена',
        'rejected': 'Отклонена',
        'implemented': 'Выполнена',
        'cancelled': 'Отменена',
        'expired': 'Истекла',
    }
    return labels.get(status_value, status_value)


def get_type_label(type_value):
    """Получить русское название типа заявки"""
    labels = {
        'new_access': 'Новый доступ',
        'modify_access': 'Изменение доступа',
        'revoke_access': 'Отзыв доступа',
        'temporary_access': 'Временный доступ',
    }
    return labels.get(type_value, type_value)


def get_approval_status_label(status_value):
    """Получить русское название статуса согласования"""
    labels = {
        'pending': 'Ожидает',
        'approved': 'Одобрено',
        'rejected': 'Отклонено',
    }
    return labels.get(status_value, status_value)


def format_date(dt):
    """Форматировать дату"""
    if not dt:
        return '—'
    if isinstance(dt, str):
        return dt[:10]
    return dt.strftime('%d.%m.%Y %H:%M')


def get_all_requests(db: Session):
    """Получить все заявки с полной информацией"""
    requests = db.query(AccessRequest).options(
        joinedload(AccessRequest.requester),
        joinedload(AccessRequest.target_user),
        joinedload(AccessRequest.system),
        joinedload(AccessRequest.subsystem),
        joinedload(AccessRequest.access_role),
        joinedload(AccessRequest.approvals).joinedload(Approval.approver),
        joinedload(AccessRequest.comments),
    ).order_by(AccessRequest.created_at.desc()).all()
    return requests


@router.get("/pdf")
async def export_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Экспорт всех заявок в PDF (только для администраторов)"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import os

    # Регистрация шрифта с поддержкой кириллицы
    font_path = "/usr/share/fonts/dejavu/DejaVuSans.ttf"
    font_bold_path = "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"

    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))
        if os.path.exists(font_bold_path):
            pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', font_bold_path))
        default_font = 'DejaVuSans'
        bold_font = 'DejaVuSans-Bold' if os.path.exists(font_bold_path) else 'DejaVuSans'
    else:
        # Fallback - попробуем другие пути
        alt_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
        ]
        default_font = 'Helvetica'
        bold_font = 'Helvetica-Bold'
        for path in alt_paths:
            if os.path.exists(path):
                pdfmetrics.registerFont(TTFont('DejaVuSans', path))
                default_font = 'DejaVuSans'
                bold_font = 'DejaVuSans'
                break

    requests = get_all_requests(db)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=10*mm,
        leftMargin=10*mm,
        topMargin=15*mm,
        bottomMargin=10*mm
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=bold_font,
        fontSize=18,
        spaceAfter=10,
        textColor=colors.HexColor('#16306C'),
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName=default_font,
        fontSize=11,
        spaceAfter=5,
        textColor=colors.HexColor('#666666'),
    )

    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontName=default_font,
        fontSize=8,
        leading=10,
    )

    elements = []

    # Заголовок
    elements.append(Paragraph("Реестр заявок на доступ", title_style))
    elements.append(Paragraph(f"Дата выгрузки: {datetime.now().strftime('%d.%m.%Y %H:%M')}", subtitle_style))
    elements.append(Paragraph(f"Всего заявок: {len(requests)}", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    # Заголовки таблицы
    headers = ['№', 'Номер', 'Статус', 'Тип', 'Система', 'Роль', 'Для кого', 'Инициатор', 'Создана', 'Цель']

    # Данные таблицы
    data = [headers]

    for req in requests:
        purpose_text = req.purpose or '—'
        if len(purpose_text) > 35:
            purpose_text = purpose_text[:35] + '...'

        data.append([
            str(req.id),
            req.request_number or '—',
            get_status_label(req.status.value if req.status else '—'),
            get_type_label(req.request_type.value if req.request_type else '—'),
            (req.system.name if req.system else '—')[:20],
            (req.access_role.name if req.access_role else '—')[:15],
            (req.target_user.full_name if req.target_user else '—')[:20],
            (req.requester.full_name if req.requester else '—')[:20],
            format_date(req.created_at),
            purpose_text,
        ])

    # Ширина колонок
    col_widths = [25, 70, 65, 55, 70, 60, 70, 70, 55, 100]

    # Создание таблицы
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        # Заголовок
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16306C')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), bold_font),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),

        # Данные
        ('FONTNAME', (0, 1), (-1, -1), default_font),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # ID по центру
        ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),

        # Границы и чередование цветов
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    filename = f"zajavki_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/word")
async def export_word(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Экспорт всех заявок в Word (только для администраторов)"""
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor, Cm
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    requests = get_all_requests(db)

    doc = Document()

    # Установка стиля по умолчанию
    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(11)

    # Заголовок
    title = doc.add_heading('Реестр заявок на доступ', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Информация о выгрузке
    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info.add_run(f'Дата выгрузки: {datetime.now().strftime("%d.%m.%Y %H:%M")}\n').bold = False
    info.add_run(f'Всего заявок: {len(requests)}')

    doc.add_paragraph()

    # Сводная таблица
    doc.add_heading('Сводная таблица', level=1)

    table = doc.add_table(rows=1, cols=8)
    table.style = 'Table Grid'
    table.autofit = True

    # Заголовки
    header_cells = table.rows[0].cells
    headers = ['Номер', 'Статус', 'Тип', 'Система', 'Роль', 'Для кого', 'Инициатор', 'Дата']

    for i, header in enumerate(headers):
        cell = header_cells[i]
        cell.text = header
        # Форматирование заголовка
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.size = Pt(10)
        # Цвет фона
        shading = OxmlElement('w:shd')
        shading.set(qn('w:fill'), '16306C')
        cell._tc.get_or_add_tcPr().append(shading)
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.font.color.rgb = RGBColor(255, 255, 255)

    # Данные
    for req in requests:
        row_cells = table.add_row().cells
        row_cells[0].text = req.request_number or '—'
        row_cells[1].text = get_status_label(req.status.value if req.status else '—')
        row_cells[2].text = get_type_label(req.request_type.value if req.request_type else '—')
        row_cells[3].text = req.system.name if req.system else '—'
        row_cells[4].text = req.access_role.name if req.access_role else '—'
        row_cells[5].text = req.target_user.full_name if req.target_user else '—'
        row_cells[6].text = req.requester.full_name if req.requester else '—'
        row_cells[7].text = format_date(req.created_at)

        # Размер шрифта для данных
        for cell in row_cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(9)

    doc.add_paragraph()
    doc.add_page_break()

    # Детальная информация по каждой заявке
    doc.add_heading('Детальная информация по заявкам', level=1)

    for req in requests:
        # Заголовок заявки
        req_heading = doc.add_heading(f'Заявка {req.request_number}', level=2)

        # Таблица с деталями
        info_table = doc.add_table(rows=0, cols=2)
        info_table.style = 'Table Grid'

        details = [
            ('Статус', get_status_label(req.status.value if req.status else '—')),
            ('Тип заявки', get_type_label(req.request_type.value if req.request_type else '—')),
            ('Система', req.system.name if req.system else '—'),
            ('Подсистема', req.subsystem.name if req.subsystem else '—'),
            ('Роль доступа', req.access_role.name if req.access_role else '—'),
            ('Для сотрудника', req.target_user.full_name if req.target_user else '—'),
            ('Инициатор', req.requester.full_name if req.requester else '—'),
            ('Дата создания', format_date(req.created_at)),
            ('Дата отправки', format_date(req.submitted_at)),
            ('Дата завершения', format_date(req.completed_at)),
            ('Временный доступ', 'Да' if req.is_temporary else 'Нет'),
        ]

        if req.is_temporary:
            details.append(('Действителен с', format_date(req.valid_from)))
            details.append(('Действителен до', format_date(req.valid_until)))

        details.append(('Цель / Обоснование', req.purpose or '—'))

        for label, value in details:
            row = info_table.add_row()
            row.cells[0].text = label
            row.cells[1].text = str(value)
            # Форматирование
            for paragraph in row.cells[0].paragraphs:
                for run in paragraph.runs:
                    run.bold = True
                    run.font.size = Pt(10)
            for paragraph in row.cells[1].paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(10)

        # Цепочка согласования
        if req.approvals:
            doc.add_paragraph()
            approval_para = doc.add_paragraph()
            approval_para.add_run('Цепочка согласования:').bold = True

            for approval in sorted(req.approvals, key=lambda a: a.step_number):
                status_text = get_approval_status_label(approval.status.value if approval.status else '—')
                approver_name = approval.approver.full_name if approval.approver else 'Не назначен'
                role = approval.approver_role or '—'

                line = f"\n   Этап {approval.step_number}: {approver_name} ({role}) — {status_text}"
                if approval.decision_date:
                    line += f" ({format_date(approval.decision_date)})"
                if approval.comment:
                    line += f"\n      Комментарий: {approval.comment}"

                doc.add_paragraph(line)

        doc.add_paragraph()

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    filename = f"zajavki_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/excel")
async def export_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Экспорт всех заявок в Excel (только для администраторов)"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
    from openpyxl.utils import get_column_letter

    requests = get_all_requests(db)

    wb = Workbook()

    # Стили
    header_fill = PatternFill(start_color="16306C", end_color="16306C", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    data_font = Font(size=10)
    thin_border = Border(
        left=Side(style='thin', color='CCCCCC'),
        right=Side(style='thin', color='CCCCCC'),
        top=Side(style='thin', color='CCCCCC'),
        bottom=Side(style='thin', color='CCCCCC')
    )
    center_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    left_alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # ===== Лист 1: Все заявки =====
    ws = wb.active
    ws.title = "Заявки"

    headers = [
        'ID', 'Номер заявки', 'Статус', 'Тип заявки', 'Система', 'Подсистема',
        'Роль доступа', 'Для сотрудника', 'Email получателя', 'Инициатор', 'Email инициатора',
        'Дата создания', 'Дата отправки', 'Дата завершения', 'Текущий этап',
        'Временный доступ', 'Действителен с', 'Действителен до', 'Цель / Обоснование'
    ]

    # Заголовки
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = center_alignment

    # Данные
    for row_idx, req in enumerate(requests, 2):
        data = [
            req.id,
            req.request_number,
            get_status_label(req.status.value if req.status else '—'),
            get_type_label(req.request_type.value if req.request_type else '—'),
            req.system.name if req.system else '—',
            req.subsystem.name if req.subsystem else '—',
            req.access_role.name if req.access_role else '—',
            req.target_user.full_name if req.target_user else '—',
            req.target_user.email if req.target_user else '—',
            req.requester.full_name if req.requester else '—',
            req.requester.email if req.requester else '—',
            format_date(req.created_at),
            format_date(req.submitted_at),
            format_date(req.completed_at),
            req.current_step,
            'Да' if req.is_temporary else 'Нет',
            format_date(req.valid_from) if req.is_temporary else '—',
            format_date(req.valid_until) if req.is_temporary else '—',
            req.purpose or '—',
        ]

        for col_idx, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = left_alignment if col_idx > 1 else center_alignment

    # Ширина колонок
    column_widths = [6, 18, 15, 18, 20, 15, 18, 22, 25, 22, 25, 16, 16, 16, 12, 15, 16, 16, 40]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width

    # Закрепить заголовок
    ws.freeze_panes = 'A2'

    # ===== Лист 2: Согласования =====
    ws2 = wb.create_sheet("Согласования")

    approval_headers = [
        'ID заявки', 'Номер заявки', 'Этап', 'Согласующий', 'Email', 'Роль',
        'Статус', 'Дата решения', 'Комментарий'
    ]

    for col, header in enumerate(approval_headers, 1):
        cell = ws2.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = center_alignment

    row_idx = 2
    for req in requests:
        for approval in sorted(req.approvals, key=lambda a: a.step_number):
            data = [
                req.id,
                req.request_number,
                approval.step_number,
                approval.approver.full_name if approval.approver else '—',
                approval.approver.email if approval.approver else '—',
                approval.approver_role or '—',
                get_approval_status_label(approval.status.value if approval.status else '—'),
                format_date(approval.decision_date),
                approval.comment or '—',
            ]

            for col_idx, value in enumerate(data, 1):
                cell = ws2.cell(row=row_idx, column=col_idx, value=value)
                cell.font = data_font
                cell.border = thin_border
                cell.alignment = left_alignment if col_idx > 2 else center_alignment

            row_idx += 1

    approval_widths = [10, 18, 8, 25, 30, 20, 15, 18, 40]
    for col, width in enumerate(approval_widths, 1):
        ws2.column_dimensions[get_column_letter(col)].width = width

    ws2.freeze_panes = 'A2'

    # ===== Лист 3: Статистика =====
    ws3 = wb.create_sheet("Статистика")

    # Заголовок
    ws3.cell(row=1, column=1, value="Статистика по заявкам").font = Font(bold=True, size=14)
    ws3.merge_cells('A1:B1')

    stats = [
        ('', ''),
        ('Всего заявок', len(requests)),
        ('Черновики', sum(1 for r in requests if r.status and r.status.value == 'draft')),
        ('На рассмотрении', sum(1 for r in requests if r.status and r.status.value == 'in_review')),
        ('Одобрено', sum(1 for r in requests if r.status and r.status.value == 'approved')),
        ('Отклонено', sum(1 for r in requests if r.status and r.status.value == 'rejected')),
        ('Выполнено', sum(1 for r in requests if r.status and r.status.value == 'implemented')),
        ('Отменено', sum(1 for r in requests if r.status and r.status.value == 'cancelled')),
        ('', ''),
        ('Дата выгрузки', datetime.now().strftime('%d.%m.%Y %H:%M')),
    ]

    for row_idx, (label, value) in enumerate(stats, 2):
        if label:
            ws3.cell(row=row_idx, column=1, value=label).font = Font(bold=True, size=11)
            ws3.cell(row=row_idx, column=2, value=value).font = Font(size=11)
            ws3.cell(row=row_idx, column=1).border = thin_border
            ws3.cell(row=row_idx, column=2).border = thin_border

    ws3.column_dimensions['A'].width = 25
    ws3.column_dimensions['B'].width = 20

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"zajavki_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
