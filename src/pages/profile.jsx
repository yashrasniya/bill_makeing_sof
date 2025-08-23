import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser, updateUser } from '../store/userSlice'; // Assuming you have an updateUser action

const Profile = () => {
    const dispatch = useDispatch();
    const { userInfo } = useSelector((state) => state.user);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        gender: '',
        mobile_number: '',
        dob: '',
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);


    useEffect(() => {
        if (userInfo) {
            setFormData({
                username: userInfo.username || '',
                email: userInfo.email || '',
                first_name: userInfo.first_name || '',
                last_name: userInfo.last_name || '',
                gender: userInfo.gender || '',
                mobile_number: userInfo.mobile_number || '',
                dob: userInfo.dob || '',
            });
            if (userInfo.profile) {
                setPreviewImage(userInfo.profile);
            }
        }
    }, [userInfo]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let payload = { ...formData };
        if (!payload.dob || payload.dob.trim() === "") {
            payload.dob = null;
        }
        if (profileImage) {
            // Convert image to Base64
            const toBase64 = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });

            const base64Image = await toBase64(profileImage);
            payload.profile = base64Image; // add base64 string to payload
        }

        dispatch(updateUser(payload))
            .unwrap() // if using createAsyncThunk
            .then(() => {
                alert("Profile updated successfully ✅");
            })
            .catch((err) => {
                alert("Failed to update profile ❌");
                console.error(err);
            });
    };

    if (!userInfo) {
        return <div>Loading...</div>;
    }

    return (
        <div className="px-4 pt-20  py-8 mx-auto ">
            <div className={'flex flex-col items-center w-full justify-center'}>
                {/*<h1 className="text-2xl font-bold mb-6 text-center ">Profile</h1>*/}
                <form
                    onSubmit={handleSubmit}
                    className="max-w-6xl md:mx-10 md:w-full md:max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-white shadow-lg rounded-2xl p-6  "
                >
                    {/* Profile image block full-width */}
                    <div className="md:col-span-2 flex flex-col items-center mb-6">
                        {previewImage ? (
                            <img
                                src={previewImage}
                                alt="Profile"
                                className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full border-4 border-blue-500 shadow-md mb-4"
                            />
                        ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-dashed flex items-center justify-center text-gray-400 mb-4">
                                Upload
                            </div>
                        )}
                        <label
                            htmlFor="profile"
                            className="cursor-pointer bg-[#071952]  text-white py-2 px-4 rounded-lg shadow-md"
                        >
                            Upload Profile Image
                        </label>
                        <input
                            type="file"
                            id="profile"
                            name="profile"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Form fields */}
                    <div>
                        <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="first_name" className="block text-gray-700 font-semibold mb-2">
                            First Name
                        </label>
                        <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="last_name" className="block text-gray-700 font-semibold mb-2">
                            Last Name
                        </label>
                        <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="gender" className="block text-gray-700 font-semibold mb-2">
                            Gender
                        </label>
                        <input
                            type="text"
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="mobile_number" className="block text-gray-700 font-semibold mb-2">
                            Mobile Number
                        </label>
                        <input
                            type="text"
                            id="mobile_number"
                            name="mobile_number"
                            value={formData.mobile_number}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="dob" className="block text-gray-700 font-semibold mb-2">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            id="dob"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Submit button full width on small, right-aligned on large */}
                    <div className="md:col-span-2 flex justify-center md:justify-end mt-4">
                        <button
                            type="submit"
                            className="bg-[#071952]  hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md"
                        >
                            Update
                        </button>
                    </div>
                </form>
            </div>



        </div>


    );
};

export default Profile;