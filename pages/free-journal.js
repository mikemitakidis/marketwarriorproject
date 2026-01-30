/**
 * Redirect from old /free-journal to new /trading-journal
 * The new journal is free for everyone - course students just get extra features
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/trading-journal',
      permanent: true,
    },
  };
}

export default function FreeJournalRedirect() {
  return null;
}
