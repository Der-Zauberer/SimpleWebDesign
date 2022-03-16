function generateNavigation() {
    if (document.getElementsByClassName("navigation").length) {
        var navigation = document.getElementsByClassName("navigation")[0];
        Array.from(document.getElementsByTagName("h2")).forEach(element => {
            if (typeof element.id != 'undefined' && !(element.id === '')) {
                navigation.innerHTML += "<a href=\"#" + element.id + "\">" + element.innerHTML + "</a>";
            }
        });
    }
}

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
    } else {
        navigation.classList.remove("responsive");
    }
    
}