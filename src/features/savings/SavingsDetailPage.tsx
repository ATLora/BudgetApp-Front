import { useParams } from 'react-router-dom';

export function SavingsDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Savings Goal Detail</h1>
      <p className="mt-1 text-muted-foreground">Goal ID: {id}</p>
    </div>
  );
}
