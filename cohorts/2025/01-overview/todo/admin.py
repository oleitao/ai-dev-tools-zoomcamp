# todo/admin.py
from django.contrib import admin
from .models import Todo

@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ("title", "is_done", "due_date", "created_at")
    list_filter = ("is_done", "due_date")
    search_fields = ("title", "description")

@admin.action(description="Mark selected todos as done")
def mark_as_done(modeladmin, request, queryset):
    queryset.update(is_done=True)

@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ("title", "is_done", "due_date", "created_at")
    actions = [mark_as_done]
