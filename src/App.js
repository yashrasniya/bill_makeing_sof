import './App.css';
import './style/root.css';
import {Login,SignUp} from './pages/login.js';
import {Home} from './pages/home.js';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {Companys} from "./pages/company's";
import {NewBill} from "./pages/new_bill";

function App() {

  return (
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Login/>}></Route>
          <Route path='/SignUp' element={<SignUp/>}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/companys' element={<Companys/>}></Route>
          <Route path='/newbill' element={<NewBill/>}></Route>
        </Routes>
      </BrowserRouter>
  );
}

export default App;
