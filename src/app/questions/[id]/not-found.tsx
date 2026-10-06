import Link from "next/link";
export default function QuestionNotFound() {
  return (
    <div className="container result-state">
      <h1>Question not found</h1>
      <p>
        This question is not available. Explore the published questions instead.
      </p>
      <Link className="button" href="/questions">
        Browse questions
      </Link>
    </div>
  );
}
