"""
Background scheduler for periodic tasks like access revocation.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

from app.db.session import SessionLocal


logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()


def check_expired_accesses():
    """Background job to check and revoke expired accesses."""
    from app.services.access_revocation import process_expired_accesses

    logger.info("Running scheduled check for expired accesses...")

    db = SessionLocal()
    try:
        results = process_expired_accesses(db)
        logger.info(
            f"Expired access check complete. "
            f"Found: {results['total_found']}, "
            f"Revoked: {results['successfully_revoked']}, "
            f"Failed: {results['failed']}"
        )
        if results['revoked_ids']:
            logger.info(f"Revoked request IDs: {results['revoked_ids']}")
    except Exception as e:
        logger.error(f"Error during expired access check: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler with configured jobs."""
    if scheduler.running:
        logger.info("Scheduler already running")
        return

    # Run expired access check every day at 1:00 AM
    scheduler.add_job(
        check_expired_accesses,
        CronTrigger(hour=1, minute=0),
        id='check_expired_accesses_daily',
        name='Daily expired access check',
        replace_existing=True
    )

    # Also run every 6 hours for more frequent checks
    scheduler.add_job(
        check_expired_accesses,
        IntervalTrigger(hours=6),
        id='check_expired_accesses_periodic',
        name='Periodic expired access check',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Background scheduler started")

    # Run initial check on startup
    check_expired_accesses()


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")


def get_scheduler_jobs():
    """Get list of scheduled jobs."""
    jobs = scheduler.get_jobs()
    return [
        {
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        }
        for job in jobs
    ]
