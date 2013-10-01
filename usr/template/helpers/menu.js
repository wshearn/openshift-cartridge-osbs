Menu = function(){};

Menu.items = [];

Menu.handleMenu = function(name) {
  for (var i = Menu.items.length - 1; i >= 0; i--) {
    if (Menu.items[i].name == name)
      Menu.items[i].active = true;
    else
      Menu.items[i].active = false;
  };
};

exports.menu = Menu;
