function toggleMenu() {
    var menu = document.getElementById("smart-menu");
    if (menu.className === "menu") {
        menu.className += " responsive";
    } else {
        menu.className = "menu";
    }
}