# todo/tests.py
from django.test import TestCase
from django.urls import reverse
from .models import Todo

class TodoViewsTests(TestCase):
    def test_create_todo(self):
        response = self.client.post(reverse("todo:create"), {
            "title": "Test todo",
            "description": "Some description",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Todo.objects.count(), 1)

    def test_list_todos(self):
        Todo.objects.create(title="Item 1")
        response = self.client.get(reverse("todo:list"))
        self.assertContains(response, "Item 1")
