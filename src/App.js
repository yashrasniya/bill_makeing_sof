import './App.css';
import style from './style/root.css';
import {Login,SignUp} from './pages/login.js';
import {Home} from './pages/home.js';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {Companys} from "./pages/company's";
import {New_bill} from "./pages/new_bill";

function App() {

  return (
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Login/>}></Route>
          <Route path='/SignUp' element={<SignUp/>}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/companys' element={<Companys/>}></Route>
          <Route path='/newBill' element={<New_bill/>}></Route>
        </Routes>
      </BrowserRouter>
  );
}

export default App;
