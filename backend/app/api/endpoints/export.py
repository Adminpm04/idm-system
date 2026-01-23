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
    labels = {
        'draft': 'Черновик',
        'submitted': 'Отправлено',
        'in_review': 'На согласовании',
        'approved': 'Согласовано',
        'rejected': 'Отклонено',
        'implemented': 'Реализовано',
        'cancelled': 'Отменено',
    }
    return labels.get(status_value, status_value)


def get_type_label(type_value):
    labels = {
        'new_access': 'Новый доступ',
        'modify_access': 'Изменение доступа',
        'revoke_access': 'Отзыв доступа',
        'temporary_access': 'Временный доступ',
    }
    return labels.get(type_value, type_value)


def format_date(dt):
    if not dt:
        return '-'
    if isinstance(dt, str):
        return dt[:10]
    return dt.strftime('%d.%m.%Y %H:%M')


def get_all_requests(db: Session):
    """Get all requests with full details"""
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
    """Export all requests to PDF (admin only)"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    requests = get_all_requests(db)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=10*mm,
        leftMargin=10*mm,
        topMargin=10*mm,
        bottomMargin=10*mm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
    )

    elements = []

    # Title
    elements.append(Paragraph(f"IDM System - Export zajavok ({len(requests)} zapisej)", title_style))
    elements.append(Paragraph(f"Data eksporta: {datetime.now().strftime('%d.%m.%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 10*mm))

    # Table data
    data = [['#', 'Nomer', 'Status', 'Tip', 'Sistema', 'Podsistema', 'Rol', 'Dlja', 'Iniciator', 'Sozdana', 'Cel']]

    for req in requests:
        data.append([
            str(req.id),
            req.request_number or '-',
            get_status_label(req.status.value if req.status else '-'),
            get_type_label(req.request_type.value if req.request_type else '-'),
            req.system.name if req.system else '-',
            req.subsystem.name if req.subsystem else '-',
            req.access_role.name if req.access_role else '-',
            req.target_user.full_name if req.target_user else '-',
            req.requester.full_name if req.requester else '-',
            format_date(req.created_at),
            (req.purpose[:30] + '...') if req.purpose and len(req.purpose) > 30 else (req.purpose or '-'),
        ])

    # Create table
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16306C')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))

    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    filename = f"idm_requests_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

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
    """Export all requests to Word (admin only)"""
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    requests = get_all_requests(db)

    doc = Document()

    # Title
    title = doc.add_heading('IDM System - Eksport zajavok', 0)
    doc.add_paragraph(f'Data eksporta: {datetime.now().strftime("%d.%m.%Y %H:%M")}')
    doc.add_paragraph(f'Vsego zajavok: {len(requests)}')
    doc.add_paragraph()

    # Create table
    table = doc.add_table(rows=1, cols=9)
    table.style = 'Table Grid'

    # Header row
    header_cells = table.rows[0].cells
    headers = ['Nomer', 'Status', 'Tip', 'Sistema', 'Rol', 'Dlja kogo', 'Iniciator', 'Data', 'Cel zajavki']
    for i, header in enumerate(headers):
        header_cells[i].text = header
        header_cells[i].paragraphs[0].runs[0].bold = True

    # Data rows
    for req in requests:
        row_cells = table.add_row().cells
        row_cells[0].text = req.request_number or '-'
        row_cells[1].text = get_status_label(req.status.value if req.status else '-')
        row_cells[2].text = get_type_label(req.request_type.value if req.request_type else '-')
        row_cells[3].text = req.system.name if req.system else '-'
        row_cells[4].text = req.access_role.name if req.access_role else '-'
        row_cells[5].text = req.target_user.full_name if req.target_user else '-'
        row_cells[6].text = req.requester.full_name if req.requester else '-'
        row_cells[7].text = format_date(req.created_at)
        row_cells[8].text = req.purpose or '-'

    # Add detailed info for each request
    doc.add_paragraph()
    doc.add_heading('Detalnaja informacija po zajavkam', level=1)

    for req in requests:
        doc.add_heading(f'{req.request_number}', level=2)

        info_table = doc.add_table(rows=0, cols=2)
        info_table.style = 'Table Grid'

        details = [
            ('Status', get_status_label(req.status.value if req.status else '-')),
            ('Tip zajavki', get_type_label(req.request_type.value if req.request_type else '-')),
            ('Sistema', req.system.name if req.system else '-'),
            ('Podsistema', req.subsystem.name if req.subsystem else '-'),
            ('Rol dostupa', req.access_role.name if req.access_role else '-'),
            ('Dlja kogo', req.target_user.full_name if req.target_user else '-'),
            ('Iniciator', req.requester.full_name if req.requester else '-'),
            ('Data sozdanija', format_date(req.created_at)),
            ('Data otpravki', format_date(req.submitted_at)),
            ('Data zavershenija', format_date(req.completed_at)),
            ('Vremennyj dostup', 'Da' if req.is_temporary else 'Net'),
            ('Dejstvitelen s', format_date(req.valid_from) if req.is_temporary else '-'),
            ('Dejstvitelen do', format_date(req.valid_until) if req.is_temporary else '-'),
            ('Cel/Obosnovanie', req.purpose or '-'),
        ]

        for label, value in details:
            row = info_table.add_row()
            row.cells[0].text = label
            row.cells[1].text = str(value)

        # Approvals
        if req.approvals:
            doc.add_paragraph()
            doc.add_paragraph('Cepochka soglasovanija:', style='Intense Quote')
            for approval in sorted(req.approvals, key=lambda a: a.step_number):
                status_text = {
                    'pending': 'Ozhidaet',
                    'approved': 'Soglasovano',
                    'rejected': 'Otkloneno',
                }.get(approval.status.value if approval.status else '', approval.status.value if approval.status else '-')

                approver_name = approval.approver.full_name if approval.approver else 'Neizvestno'
                doc.add_paragraph(
                    f"  Etap {approval.step_number}: {approver_name} ({approval.approver_role or '-'}) - {status_text}"
                    + (f" ({format_date(approval.decision_date)})" if approval.decision_date else "")
                    + (f": {approval.comment}" if approval.comment else "")
                )

        doc.add_paragraph()

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    filename = f"idm_requests_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"

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
    """Export all requests to Excel (admin only)"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Fill, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    requests = get_all_requests(db)

    wb = Workbook()

    # Sheet 1: All requests
    ws = wb.active
    ws.title = "Zajavki"

    # Header style
    header_fill = PatternFill(start_color="16306C", end_color="16306C", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    headers = [
        'ID', 'Nomer zajavki', 'Status', 'Tip zajavki', 'Sistema', 'Podsistema',
        'Rol dostupa', 'Dlja kogo', 'Email poluchatelja', 'Iniciator', 'Email iniciatora',
        'Data sozdanija', 'Data otpravki', 'Data zavershenija', 'Tekuschij etap',
        'Vremennyj dostup', 'Dejstvitelen s', 'Dejstvitelen do', 'Cel/Obosnovanie'
    ]

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    # Data rows
    for row_idx, req in enumerate(requests, 2):
        data = [
            req.id,
            req.request_number,
            get_status_label(req.status.value if req.status else '-'),
            get_type_label(req.request_type.value if req.request_type else '-'),
            req.system.name if req.system else '-',
            req.subsystem.name if req.subsystem else '-',
            req.access_role.name if req.access_role else '-',
            req.target_user.full_name if req.target_user else '-',
            req.target_user.email if req.target_user else '-',
            req.requester.full_name if req.requester else '-',
            req.requester.email if req.requester else '-',
            format_date(req.created_at),
            format_date(req.submitted_at),
            format_date(req.completed_at),
            req.current_step,
            'Da' if req.is_temporary else 'Net',
            format_date(req.valid_from) if req.is_temporary else '-',
            format_date(req.valid_until) if req.is_temporary else '-',
            req.purpose or '-',
        ]

        for col_idx, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical='center', wrap_text=True)

    # Auto-width columns
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 15

    # Sheet 2: Approvals
    ws2 = wb.create_sheet("Soglasovanija")

    approval_headers = [
        'ID zajavki', 'Nomer zajavki', 'Etap', 'Soglasujuschij', 'Email', 'Rol',
        'Status', 'Data reshenija', 'Kommentarij'
    ]

    for col, header in enumerate(approval_headers, 1):
        cell = ws2.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border

    row_idx = 2
    for req in requests:
        for approval in sorted(req.approvals, key=lambda a: a.step_number):
            status_text = {
                'pending': 'Ozhidaet',
                'approved': 'Soglasovano',
                'rejected': 'Otkloneno',
            }.get(approval.status.value if approval.status else '', '-')

            data = [
                req.id,
                req.request_number,
                approval.step_number,
                approval.approver.full_name if approval.approver else '-',
                approval.approver.email if approval.approver else '-',
                approval.approver_role or '-',
                status_text,
                format_date(approval.decision_date),
                approval.comment or '-',
            ]

            for col_idx, value in enumerate(data, 1):
                cell = ws2.cell(row=row_idx, column=col_idx, value=value)
                cell.border = thin_border

            row_idx += 1

    for col in range(1, len(approval_headers) + 1):
        ws2.column_dimensions[get_column_letter(col)].width = 18

    # Sheet 3: Statistics
    ws3 = wb.create_sheet("Statistika")

    stats = [
        ('Vsego zajavok', len(requests)),
        ('Chernoviki', sum(1 for r in requests if r.status and r.status.value == 'draft')),
        ('Na soglasovanii', sum(1 for r in requests if r.status and r.status.value == 'in_review')),
        ('Soglasovano', sum(1 for r in requests if r.status and r.status.value == 'approved')),
        ('Otkloneno', sum(1 for r in requests if r.status and r.status.value == 'rejected')),
        ('Realizovano', sum(1 for r in requests if r.status and r.status.value == 'implemented')),
        ('', ''),
        ('Data eksporta', datetime.now().strftime('%d.%m.%Y %H:%M')),
    ]

    for row_idx, (label, value) in enumerate(stats, 1):
        ws3.cell(row=row_idx, column=1, value=label).font = Font(bold=True)
        ws3.cell(row=row_idx, column=2, value=value)

    ws3.column_dimensions['A'].width = 25
    ws3.column_dimensions['B'].width = 20

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"idm_requests_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
