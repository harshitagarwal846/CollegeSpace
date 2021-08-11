var checkbox2 = document.getElementById("joinClass3");
var password2 = document.getElementById("joinClass2");

checkbox2.addEventListener("click", () => {
    if (checkbox2.checked)
        password2.type = "text";
    else
        password2.type = "password";
});