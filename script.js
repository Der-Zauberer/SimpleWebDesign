function toggleMenu() {
    var menu = document.getElementById("smart-menu");
    if (!menu.classList.contains("responsive")) {
        menu.className += " responsive";
    } else {
        menu.classList.remove("responsive");
    }
}

function toggleNavigation() {
    var navigation = document.getElementById("smart-navigation");
    if (!navigation.classList.contains("responsive")) {
        navigation.className += " responsive";
        document.body.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    } else {
        navigation.classList.remove("responsive");
        document.body.style.backgroundColor = "white";
    }
    
}