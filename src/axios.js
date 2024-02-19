import axios from "axios";

export const clientToken = axios.create({
    baseURL: process.env.REACT_APP_URL,
    headers:{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+window.localStorage.getItem('token')

    },
});