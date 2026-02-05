/**
 * Redirect: /trading-journal/widgets -> /trading-journal/popular-investors
 * This page was renamed. Redirect anyone with old bookmarks.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/trading-journal/popular-investors',
      permanent: true,
    },
  };
}

export default function WidgetsRedirect() {
  return null;
}
