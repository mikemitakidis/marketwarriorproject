/**
 * Signup page.
 *
 * Redirects to the login page with register mode enabled.
 * The login page template has both Login and Register forms built-in.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/login?register=true',
      permanent: false,
    },
  };
}

export default function SignupPage() {
  // This won't render because we redirect in getServerSideProps
  return null;
}
