from rest_framework import serializers
from .models import JobSheet, Branch, JobStatus, AdvancePaidStatus


class JobSheetSerializer(serializers.ModelSerializer):
    """
    Output keys are camelCase (jobNo, createdDate, eta, isRepaired)
    """
    
    jobNo = serializers.CharField(source="job_no")
    createdDate = serializers.DateField(source="created_date")
    advancePaid = serializers.CharField(source="advance_paid")  # 👈 CharField
    assignedBy = serializers.CharField(source="assigned_by", required=False, allow_blank=True)
    eta = serializers.DateField()
    approvedEta = serializers.DateField(source="approved_eta", required=False, allow_null=True)
    isRepaired = serializers.BooleanField(source="is_repaired", required=False, allow_null=True)

    class Meta:
        model = JobSheet
        fields = [
            "id",
            "jobNo",
            "createdDate",
            "branch",
            "assignedBy",
            "status",
            "eta",
            "approvedEta",
            "advancePaid",
            "isRepaired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_jobNo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Job sheet number can't be empty.")
        return value

    def validate_branch(self, value):
        if value not in Branch.values:
            raise serializers.ValidationError(f"Branch must be one of {Branch.values}.")
        return value

    def validate_status(self, value):
        if value not in JobStatus.values:
            raise serializers.ValidationError(f"Status must be one of {JobStatus.values}.")
        return value

    def validate_assignedBy(self, value):
        return value.strip()
    
    # 👇 Validate advance_paid
    def validate_advance_paid(self, value):
        if value not in AdvancePaidStatus.values:
            raise serializers.ValidationError(
                f"Advance Paid must be one of {AdvancePaidStatus.values}."
            )
        return value

    # 👇 Main Validation
    def validate(self, data):
        status = data.get('status')
        is_repaired = data.get('is_repaired')
        
        # ===== CLOSED STATUS =====
        if status == JobStatus.CLOSED:
            # is_repaired must be True or False for Closed jobs
            if is_repaired is None:
                raise serializers.ValidationError({
                    "is_repaired": "Closed jobs must be marked as Repaired or Unrepaired."
                })
            if is_repaired is not True and is_repaired is not False:
                raise serializers.ValidationError({
                    "is_repaired": "Closed jobs must be marked as Repaired (True) or Unrepaired (False)."
                })
        
        return data

    def to_representation(self, instance):
        """Ensure advancePaid is always a valid string value, not numeric"""
        data = super().to_representation(instance)
        
        # 👇 FIX: Convert any numeric values to proper strings
        advance_paid = data.get('advancePaid')
        if advance_paid == '1' or advance_paid == 1 or advance_paid is True:
            data['advancePaid'] = 'Paid'
        elif advance_paid == '0' or advance_paid == 0 or advance_paid is False:
            data['advancePaid'] = 'Unpaid'
        elif advance_paid not in ['Paid', 'Unpaid', 'NA', None, '']:
            data['advancePaid'] = 'Unpaid'  # Default to Unpaid for unknown values
        
        return data

    def create(self, validated_data):
        return JobSheet.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class JobSheetStatsSerializer(serializers.Serializer):
    """Used by the /api/*/jobsheets/stats/ endpoint that feeds the stat cards."""
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    ready = serializers.IntegerField()
    approved_pending = serializers.IntegerField()
    approved = serializers.IntegerField()
    closed = serializers.IntegerField()
    rejected = serializers.IntegerField()
    repaired = serializers.IntegerField()
    unrepaired = serializers.IntegerField()
    today_eta = serializers.IntegerField()
    tomorrow_eta = serializers.IntegerField()