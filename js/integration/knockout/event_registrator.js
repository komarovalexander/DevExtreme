"use strict";

var $ = require("jquery"),
    ko = require("knockout"),
    eventRegistrator = require("../../events/core/event_registrator"),
    eventUtils = require("../../events/utils");

eventRegistrator.callbacks.add(function(name) {
    var koBindingEventName = eventUtils.addNamespace(name, name + "Binding");

    ko.bindingHandlers[name] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var $element = $(element),
                unwrappedValue = ko.utils.unwrapObservable(valueAccessor()),
                eventSource = unwrappedValue.execute ? unwrappedValue.execute : unwrappedValue;

            $element
                .off(koBindingEventName)
                .on(koBindingEventName, $.isPlainObject(unwrappedValue) ? unwrappedValue : {}, function(e) {
                    eventSource.call(viewModel, viewModel, e);
                });
        }
    };
});
