import { createContext, useState } from "react";

export const AuthContext = createContext()

export const AuthProvider = ({children})=>{
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      })
    const [userDetails,setUserDetails] = useState({})

    

    const login = (data) =>{
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data));
    }

    const logout = () =>{
        setUser(null)
        setUserDetails({})
        localStorage.removeItem('user');
    }

    const getUserDetails = (data) =>{
        setUserDetails(data)
    }
    

    return(
        <AuthContext.Provider value={{user,login,logout,userDetails,getUserDetails}}>
            {children}
        </AuthContext.Provider>
    )

}