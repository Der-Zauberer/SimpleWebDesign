document.addEventListener('readystatechange', event => { 
    if (event.target.readyState === "interactive") {onLoad();}
    if (event.target.readyState === "complete") {}
});

//This function will be called, if the body does load the first time
function onLoad() {
    const navigation = document.getElementById("navigation")
    const menu = document.getElementById("smart-menu");
    if (navigation && navigation.classList.contains("navigation-headlines")) generateNavigation();
    if (menu) initializeSmartMenu();
}

//Remove all elements of menu from the viewport except for the title and images
function initializeSmartMenu() {
    const menu = document.getElementById("smart-menu");
    const menuToggle = document.getElementById("menu-toggle");
    const navigation = document.getElementById("navigation");
    if (menu) {
        document.addEventListener("click", onMouseClick);
        window.addEventListener("resize", onWindowResize);
        menuToggle.addEventListener("click", toggleSmartMenu);
        Array.from(menu.children).forEach(element => {
            if (!element.classList.contains("menu-title") && !(element.tagName === "IMG")) {
                element.classList.add("not-mobile");
            }
        });
    }
    if (!navigation) menu.outerHTML += "<div id=\"navigation\" class=\"navigation only-mobile\"></div>";
}

//Generate a link to a h2 headline at the bottom of the navigation
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

//Toggle the navigation for the menu on mobile devices
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

//Focus the element in the menu, which has the innerHtml of string
function setMenuFocus(string) {
    let menu = document.getElementsByClassName("menu").item(0);
    if (menu) {
        Array.from(menu.children).forEach(element => {
            if (element.innerHTML === string) {
                element.classList.add("menu-active");
                return;
            }
        });
    }
}

// private
function onMouseClick(event) {
    const navigation = document.getElementById("navigation");
    if (navigation) {
        if (navigation.classList.contains("navigation-display") && event.clientX > 250) {
            toggleSmartMenu();
        }
    }
}

//private
function onWindowResize() {
    const navigation = document.getElementById("navigation");
    if (navigation) {
        if (navigation.classList.contains("navigation-display")) {
            toggleSmartMenu();
        }
    }
}

//private
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