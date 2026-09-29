import { useEffect } from "react";
import LoginButton from "../components/LoginButton";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/user-auth-form";
import bankImage from '/imgs/bank.jpg'
function LandingPage() {
  const { isAuthenticated } = useAuth0();

  useEffect(() => {
    document.title = "Authentication";
    const metaDescription = document.createElement("meta");
    metaDescription.name = "description";
    metaDescription.content =
      "Authentication forms built using the components.";
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(metaDescription);
    };
  }, []);

  return (
    <>
      <div className="md:hidden">
        <img
          src="/examples/authentication-light.png"
          width={1280}
          height={1080}
          alt="Authentication"
          className="block dark:hidden"
        />
        <img
          src="/examples/authentication-dark.png"
          width={1280}
          height={1080}
          alt="Authentication"
          className="hidden dark:block"
        />
      </div>
      <div className="container relative hidden h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <Link
          to="/examples/authentication"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute right-4 top-4 md:right-8 md:top-8"
          )}
        >
          Login
        </Link>
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <img
            src={bankImage}
            alt="Background"
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Dolfin Inc
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;This app has saved me countless hours of work and helped
                me get financial information faster than ever before.&rdquo;
              </p>
              <footer className="text-sm">Maya Thornton</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </div>
            <UserAuthForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <Link
                to="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default LandingPage;
