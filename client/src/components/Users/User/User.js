import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const User = ({user}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const goDetail = () => {
        // navigate(`/${user.SSN}`);
    }

    return (
    <>
        <tr role="button" onClick={goDetail}>
            <td>{user.name}</td>
            <td>{user.role}</td>
            <td>{ user.available ? "Free" : "Working" }</td>
            <td>{
            user.role == "janitor" ? `MCP ${user.mcp}` : user.role == "collector" ? `Truck ${user.truck}` : ""
                }</td>
        </tr>             
    </>)
};

export default User;