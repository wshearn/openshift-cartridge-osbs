Menu = {};
Menu.items = [];
Menu.handleMenu = handleMenu;

function handleMenu (name) {
    for (var i = Menu.items.length - 1; i >= 0; i--) {
        Menu.items[i].active = (Menu.items[i].name == name);
    }
}

// Navbar Items
Menu.items[Menu.items.length] = {
    name: "Account Stats",
    url: "/accountstats",
    title: "Account Stats",
    active: false
};
Menu.items[Menu.items.length] = {
    name: "Gear List",
    url: "/gearlist",
    title: "Gear List",
    active: false
};
Menu.items[Menu.items.length] = {
    name: "API Docs",
    url: "/apidocs",
    title: "API Docs",
    active: false
};
exports.menu = Menu;
