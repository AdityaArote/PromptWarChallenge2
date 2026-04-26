from pydantic import BaseModel


class QuizSubmission(BaseModel):
    answers: list[int]  # index of selected option per question
    questions: list[dict]  # full question objects returned from /generate
