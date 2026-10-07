import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui/primitives";

export default function NotFound() {
  return (
    <div className="card" style={{ marginTop: 40 }}>
      <EmptyState
        icon={Compass}
        title="Page not found"
        text="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
