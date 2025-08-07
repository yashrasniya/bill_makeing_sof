import React from 'react';
import { Link } from 'react-router-dom';

const ThanksPage = ({ message }) => {
    // A default message in case the prop is not provided.
    const displayMessage = message || "Your Account is Register Successfully, " +
        "We will Go throw your Account and after varification we will inform you by email.";

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#f4f4f9'
        }}>
            <h1>Thank You!</h1>
            <p style={{ fontSize: '1.2rem', margin: '20px 0', color: '#333' }}>{displayMessage}</p>
            <Link to="/" style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '5px'
            }}>
                Go to Homepage
            </Link>
        </div>
    );
};

export default ThanksPage;