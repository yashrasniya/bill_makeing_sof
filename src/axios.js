import axios from "axios";
axios.defaults.withCredentials = true; // even for get requests if
axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.xsrfHeaderName = 'x-csrftoken'
export const clientToken = axios.create({
    baseURL: process.env.REACT_APP_URL,
    headers:{
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer '+ window.localStorage.getItem('token')

    },
});