from datetime import date, timedelta

from django.core.management.base import BaseCommand
from jobsheets.models import JobSheet, Branch, JobStatus


class Command(BaseCommand):
    help = "Seed the database with sample job sheets for local testing / demos."

    def handle(self, *args, **options):
        today = date.today()
        sample = [
            ("20320018110", Branch.ANDHERI, JobStatus.PENDING, today, today + timedelta(days=2)),
            ("20320018111", Branch.THANE, JobStatus.APPROVED_PENDING, today - timedelta(days=1), today + timedelta(days=1)),
            ("20320018112", Branch.DADAR, JobStatus.APPROVED, today - timedelta(days=2), today),
            ("20320018113", Branch.VASHI, JobStatus.CLOSED, today - timedelta(days=5), today - timedelta(days=1)),
            ("20320018114", Branch.ANDHERI, JobStatus.REJECTED, today - timedelta(days=3), today + timedelta(days=1)),
            ("20320018116", Branch.VASHI, JobStatus.READY, today - timedelta(days=2), today + timedelta(days=2)),
            ("20320018115", Branch.THANE, JobStatus.PENDING, today, today + timedelta(days=1)),
        ]

        created = 0
        for job_no, branch, status_, created_date, eta in sample:
            _, was_created = JobSheet.objects.get_or_create(
                job_no=job_no,
                defaults={
                    "branch": branch,
                    "status": status_,
                    "created_date": created_date,
                    "eta": eta,
                },
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created} new job sheet(s). Total in DB: {JobSheet.objects.count()}"
        ))
