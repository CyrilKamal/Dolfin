
import { useAuth0 } from "@auth0/auth0-react";
import { useCurrentUser } from "@/services";
import { useUsers } from "@/services";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "@/services/api";

export const AuthHandler: React.FC = () => {
    const { user, isAuthenticated, error, getAccessTokenSilently } = useAuth0();
    const { login, setNewUser, userState } = useCurrentUser();
    const { addNewUser } = useUsers();
    const navigate = useNavigate();

    // Auth0 redirects back here with ?error=... when login fails or the user declines
    // the consent screen. Send them back to the landing page instead of a blank page.
    useEffect(() => {
        if (error) {
            console.warn("Auth0 login did not complete:", error.message);
            navigate('/', { replace: true });
        }
    }, [error, navigate]);

    useEffect(() => {
        async function fetchAccessToken() {
            let token: string;
            try {
                token = await getAccessTokenSilently();
            } catch {
                // Not logged in (e.g. login was declined); the error effect above redirects
                return;
            }
            setAccessToken(token);
            // Login to backend if Auth0 is authenticated
            if (isAuthenticated && user?.nickname) {
                login(user.nickname);
            }
            else {
                console.log("No User Logged In");
            }
        }
        fetchAccessToken();
    }, [login]);

    // Login set NewUser to null
    useEffect(() => {
        if (!userState.newUser && userState.currentUser) {
            navigate('/home');
        }
        // If logged in through Auth0, but not in the backend, create a new user
        else if (!userState.newUser && !userState.currentUser) {
            if (user?.nickname && user?.sub) {
                addNewUser({ username: user?.nickname, auth0Id: user?.sub });
                setNewUser(user?.nickname);
                setTimeout(() => {
                    navigate('/home');
                }, 500); // Delay of 0.5 seconds
            }
        }
    }, [userState.newUser]);

    return (<></>);
};

