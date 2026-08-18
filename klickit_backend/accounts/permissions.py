from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminOrBranchUser(BasePermission):
    """
    Permission logic:
    - Admin: Full access (GET, POST, PUT, PATCH, DELETE)
    - Viewer: READ-ONLY (only GET) - CAN SEE ALL BRANCHES
    - Branch User: Branch-based access (GET, POST, PUT, PATCH), no DELETE
    """

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, "is_authenticated", False):
            return False
        
        role = getattr(request.user, "role", None)
        
        # Viewer ko sirf SAFE_METHODS (GET, HEAD, OPTIONS) allow karo
        if role == "viewer":
            return request.method in SAFE_METHODS
        
        # Admin aur Branch User ko sab allow (object level pe aur check hoga)
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not getattr(request.user, "is_authenticated", False):
            return False

        role = getattr(request.user, "role", None)
        
        # Admin ko full access
        if role == "admin":
            return True
        
        # Viewer ko sirf READ (GET) allow karo
        if role == "viewer":
            return request.method in SAFE_METHODS

        # Branch User logic (existing)
        branch = getattr(request.user, "branch", None)
        if not branch:
            return False

        # DELETE allow nahi karna branch_user ko
        if request.method == "DELETE":
            return False
        
        # Andheri branch walo ko sab access (except DELETE)
        if branch == "Andheri":
            return True

        # Branch match karo
        if hasattr(obj, "branch"):
            return str(obj.branch) == str(branch)

        if hasattr(obj, "branch_name"):
            return str(obj.branch_name) == str(branch)

        return False