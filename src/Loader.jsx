import React from 'react';

const Loader = ({loading}) => {
    if (!loading) { return null; }
    return (
        <div className={'loader_wrapper'}>
<div className="loader-container">
        <div className="spinner"></div>
        <p>Loading...</p>
    </div>
        </div>

);
};

export default Loader;
