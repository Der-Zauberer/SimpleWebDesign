function generateNavigation() {
    const navigation = document.getElementById("navigation");
    if (navigation) {
        Array.from(document.getElementsByTagName("h2")).forEach(element => {
            if (typeof element.id != 'undefined' && !(element.id === '')) {
                navigation.innerHTML += "<a href=\"#" + element.id + "\">" + element.innerHTML + "</a>";
            }
        });
    }
}

function initializeSmartMenu() {
    const menu = document.getElementById("smart-menu");
    const navigation = document.getElementById("navigation");
    if (menu) {
        document.addEventListener("click", onMouseClick);
        window.addEventListener('resize', onWindowResize);
        Array.from(menu.children).forEach(element => {
            if (!element.classList.contains("menu-title") && !(element.tagName === "IMG")) {
                element.classList.add("not-mobile");
            }
        });
    }
    if (!navigation) {
        menu.outerHTML += "<div id=\"navigation\" class=\"navigation only-mobile\"></div>";
    }
}

function toggleSmartMenu() {
    const navigation = document.getElementById("navigation");
    let navigationContent = document.getElementsByClassName("navigation-content").item(0);
    if (!navigationContent && document.getElementsByClassName("container").item(0)) navigationContent=document.getElementsByClassName("container").item(0);
    else if (document.getElementsByClassName("container-fluid").item(0)) navigationContent=document.getElementsByClassName("container-fluid").item(0);
    if (navigation) {
        if (navigation.classList.contains("navigation-display")) {
            navigation.classList.remove("navigation-display");
            if (navigationContent) navigationContent.classList.remove("navigation-content-hide");
            Array.from(navigation.children).forEach(element => {
                if (element.classList.contains("menu-item")) navigation.removeChild(element); 
            });
        } else {
            const menu = document.getElementById("smart-menu");
            generateNavigationMenu(menu, navigation);
            navigation.classList.add("navigation-display");
            if (navigationContent) navigationContent.classList.add("navigation-content-hide");
        }
        
    }
}

function onMouseClick(event) {
    const navigation = document.getElementById("navigation");
    if (navigation) {
        if (navigation.classList.contains("navigation-display") && event.clientX > 250) {
            toggleSmartMenu();
        }
    }
}

function onWindowResize() {
    const navigation = document.getElementById("navigation");
    if (navigation) {
        if (navigation.classList.contains("navigation-display")) {
            toggleSmartMenu();
        }
    }
}

function generateNavigationMenu(menu, navigation) {
    if (menu && navigation) {
        let menuString = "";
        Array.from(menu.children).forEach(element => {
            if (navigation && element.tagName === "A") {
                let innerHtml = element.innerHTML;
                if (element.classList.contains("menu-title")) innerHtml = "Home";
                let classString = "only-mobile menu-item ";
                if (element.classList.contains("menu-active")) classString += "navigation-active";
                menuString += "<a href=\"" + element.href + "\" class=\"" + classString + "\">" + innerHtml + "</a>";
            }
        });
        navigation.innerHTML = menuString + navigation.innerHTML;
    }
}