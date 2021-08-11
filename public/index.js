let checkbox1 = document.getElementById("flexCheckDefault");
let password1 = document.getElementById("loginPassword");

checkbox1.addEventListener("click", () => {
    if (checkbox1.checked)
        password1.type = "text";
    else
        password1.type = "password";
});

let checkbox2 = document.getElementById("joinClass3");
let password2 = document.getElementById("joinClass2");

checkbox2.addEventListener("click", () => {
    if (checkbox2.checked)
        password2.type = "text";
    else
        password2.type = "password";
});


