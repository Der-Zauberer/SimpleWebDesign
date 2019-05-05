function onLoad() {
}

function toggleMenu() {
    var menu = document.getElementById("smart-menu");
    if (!menu.classList.contains("responsive")) {
        menu.className += " responsive";
    } else {
        menu.classList.remove("responsive");
    }
}