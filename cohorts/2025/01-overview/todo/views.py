# todo/views.py
from django.shortcuts import render, redirect, get_object_or_404
from .models import Todo

def todo_list(request):
    todos = Todo.objects.all().order_by("-created_at")
    return render(request, "todo/list.html", {"todos": todos})

def todo_create(request):
    if request.method == "POST":
        title = request.POST.get("title")
        description = request.POST.get("description", "")
        if title:
            Todo.objects.create(title=title, description=description)
        return redirect("todo:list")
    return render(request, "todo/create.html")

def todo_toggle(request, pk):
    todo = get_object_or_404(Todo, pk=pk)
    todo.is_done = not todo.is_done
    todo.save()
    return redirect("todo:list")

def todo_delete(request, pk):
    todo = get_object_or_404(Todo, pk=pk)
    todo.delete()
    return redirect("todo:list")
