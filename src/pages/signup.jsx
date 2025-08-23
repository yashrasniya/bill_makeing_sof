import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/bill_ninja_logo.png_white.png"
import logo_background from "../assets/bill_ninja_logo.png"
import {clientToken} from "@/axios";
import {fetchUser} from "@/store/userSlice";
import {useDispatch} from "react-redux";


function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [user_details, set_user_details] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    company: {
      name: '',
      legal_name: '',
      email: '',
      phone_number: '',
      website: '',
      address: '',
      city: '',
      district: '',
      state: '',
      state_code: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch: '',
      incorporation_date: '',
      business_type: 'sole_prop',
    }
  });


  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);

  const handelChange = (e) => {
    set_user_details({
      ...user_details,
      [e.target.name]: e.target.value,
    });
    setError({ ...error, [e.target.name]: "" }); // clear field error on typing
  };

  const handelSignUp = async () => {
    setLoading(true);
    setError({}); // reset error state
    try {
      const response = await clientToken.post("register/", user_details);

      if (response.status === 201) {
        alert("✅ Account Created Successfully");
        dispatch(fetchUser());
        navigate("/");
      }
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data); // Django REST returns {field: ["error"]}
      } else {
        setError({ message: "Something went wrong. Try again!" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="login_box left h-fit">
        <div className="flex justify-center items-center w-full">
          <img src={logo} alt="logo" className="h-1/4" />
        </div>
      </div>
      <div className="login_box right">
        <div className="logo_css heading">
          <img src={logo} alt="logo" id="logo_first" />
          <img
            src={logo_background}
            id="logo_two"
            alt="logo"
            className="h-1/2"
          />
        </div>
        <h3 className="login-heading">Sign Up</h3>

        <div className="raper">
          {error?.message && (
            <p style={{ color: "red", padding: "10px 0 0 0" }}>
              {error.message}
            </p>
          )}

          {[
            { label: "User Name", name: "username", type: "text" },
            { label: "Email Address", name: "email", type: "email" },
            { label: "First Name", name: "first_name", type: "text" },
            { label: "Last Name", name: "last_name", type: "text" },
            { label: "Mobile Number", name: "mobile_number", type: "text" },
            { label: "Password", name: "password", type: "password" },
          ].map((field) => (
            <div className="input-raper" key={field.name}>
              <p>{field.label}</p>
              {error[field.name] && (
                <span style={{ color: "red", fontSize: "14px" }}>
                  {Array.isArray(error[field.name])
                    ? error[field.name][0]
                    : error[field.name]}
                </span>
              )}
              <input
                type={field.type}
                name={field.name}
                value={user_details[field.name]}
                onChange={handelChange}
                className="bg-white"
                required
              />
            </div>
          ))}

          <button onClick={handelSignUp} disabled={loading}>
            {loading ? "Creating Account..." : "Create New Account"}
          </button>
          <p className="SignUp-text" onClick={() => navigate("/")}>
            Already have an account? Login
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
