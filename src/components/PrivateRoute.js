import { Navigate, Outlet } from "react-router-dom";
import { useAuthStatus } from "../hooks/useAuthStatus";

const PrivateRoute = () => {
    const { loggedIn, checkingStatus } = useAuthStatus();

    if (checkingStatus) {
        return <h3>Loading</h3>
    }

    return loggedIn ? <Outlet /> : <Navigate to="/sign-in" />
}

export default PrivateRoute;

// import {Navigate} from 'react-router-dom'
// const PrivateRoute = ({children}) => {
// const loggedIn = true
// return loggedIn ? children : <Navigate to='/sign-in' />
// }
// export default PrivateRoute