"use strict";

var $ = require("jquery"),
    Class = require("../../core/class"),
    errors = require("../errors"),
    CommandMapping = require("../command_mapping"),
    commandToDXWidgetAdapters = require("./widget_command_adapters"),
    when = require("../../integration/jquery/deferred").when;

require("../command");
require("./command_container");

/**
* @name CommandManager
* @section applicationFramework
* @publicName CommandManager
* @type object
* @module framework/html/command_manager
* @export default
* @hidden
*/
var CommandManager = Class.inherit({
    ctor: function(options) {
        options = options || {};
        this.defaultWidgetAdapter = options.defaultWidgetAdapter || this._getDefaultWidgetAdapter();
        this.commandMapping = options.commandMapping || new CommandMapping();
    },
    _getDefaultWidgetAdapter: function() {
        return {
            addCommand: $.noop,
            clearContainer: $.noop
        };
    },
    _getContainerAdapter: function($container) {
        var componentNames = $container.data("dxComponents"),
            adapters = commandToDXWidgetAdapters;

        if(componentNames) {
            for(var index in componentNames) {
                var widgetName = componentNames[index];
                if(widgetName in adapters) {
                    //TODO return the adapter instance here
                    return adapters[widgetName];
                }
            }
        }
        return this.defaultWidgetAdapter;
    },
    /**
    * @name CommandManagerMethods_findCommands
    * @publicName findCommands(view)
    * @param1 $view:jQuery object
    */
    findCommands: function($view) {
        var result = $.map($view.addBack().find(".dx-command"), function(element) {
            return $(element).dxCommand("instance");
        });
        return result;
    },
    /**
    * @name CommandManagerMethods_findCommandContainers
    * @publicName findCommandContainers($markup)
    * @param1 $markup:jQuery object
    */
    findCommandContainers: function($markup) {
        var result = $.map($markup.find(".dx-command-container"), function(element) {
            return $(element).dxCommandContainer("instance");
        });
        return result;
    },
    _checkCommandId: function(id, command) {
        if(id === null) {
            throw errors.Error("E3010", command.element().get(0).outerHTML);
        }
    },
    /**
    * @name CommandManagermethods_renderCommandsToContainers
    * @publicName renderCommandsToContainers(commands,containers)
    * @param1 commands:array
    * @param2 containers:array
    */
    renderCommandsToContainers: function(commands, containers) {
        var that = this,
            commandHash = {},
            commandIds = [],
            deferreds = [];

        $.each(commands, function(i, command) {
            var id = command.option("id");
            that._checkCommandId(id, command); // don't remove this function. It's used in VS design-time part.
            commandIds.push(id);
            commandHash[id] = command;
        });

        that.commandMapping.checkCommandsExist(commandIds);

        $.each(containers, function(k, container) {
            var commandInfos = [];
            $.each(commandHash, function(id, command) {
                var commandId = id;//command.option("id")/* || command.option("location")*/;//TODO remove location check
                var commandOptions = that.commandMapping.getCommandMappingForContainer(commandId, container.option("id"));
                if(commandOptions) {
                    commandInfos.push({ command: command, options: commandOptions });
                }
            });
            if(commandInfos.length) {
                var deferred = that._attachCommandsToContainer(container.element(), commandInfos);
                if(deferred) {
                    deferreds.push(deferred);
                }
            }
        });

        return when.apply($, deferreds);
    },
    clearContainer: function(container) {
        var $container = container.element(),
            adapter = this._getContainerAdapter($container);

        adapter.clearContainer($container);
    },
    _arrangeCommandsToContainers: function(commands, containers) {
        errors.log("W0002", "CommandManager", "_arrangeCommandsToContainers", "14.1", "Use the 'renderCommandsToContainers' method instead.");
        this.renderCommandsToContainers(commands, containers);
    },
    _attachCommandsToContainer: function($container, commandInfos) {
        var adapter = this._getContainerAdapter($container),
            result;

        if(adapter.beginUpdate) {
            adapter.beginUpdate($container);
        }
        $.each(commandInfos, function(index, commandInfo) {
            adapter.addCommand($container, commandInfo.command, commandInfo.options);
        });
        if(adapter.endUpdate) {
            result = adapter.endUpdate($container);
        }
        return result;
    }
});

module.exports = CommandManager;
