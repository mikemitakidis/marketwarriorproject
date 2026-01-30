import { getUserFromRequest } from '../lib/serverAuth';

/**
 * Redirect from old /journal to new /trading-journal
 */
export async function getServerSideProps({ req }) {
  // Check if user is logged in
  const user = await getUserFromRequest(req);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Redirect to new trading journal
  return {
    redirect: {
      destination: '/trading-journal',
      permanent: true,
    },
  };
}

export default function JournalRedirect() {
  return null;
}
