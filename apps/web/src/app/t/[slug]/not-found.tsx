import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <div className="text-5xl font-extrabold text-navy">Gboroly</div>
      <h1 className="mt-6 text-xl font-bold text-ink">Tournoi introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Ce tournoi n’existe pas, n’est pas encore publié, ou a été retiré.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
