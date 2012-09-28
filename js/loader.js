window.kickWatcher = {

    currentProject: null,
    data: {},

    load: function() {
        var self = this;
        self.data = localStorage.kickWatcher;
        if(typeof self.data == "string") {
            self.data = jQuery.parseJSON(self.data);
        }
        if(self.data == undefined
            || self.data == "undefined") {
            self.data = {};
            self.save();
        }
    },

    save: function(pushInfo) {
        var self = this;

        localStorage.kickWatcher =  JSON.stringify(self.data);
        if(pushInfo != undefined) {
            var data = {
                type: "UPDATE_STORED_OBJECTS",
                data: self.data
            };
            chrome.extension.sendMessage(data);
        }
    },

    getProjectName: function() {
        var self = this;
        var usefulParts = document
                            .URL
                            .replace("http://"+document.location.hostname+"/projects/", "")
                            .split("?");
        usefulParts = usefulParts[0].split("/");

        self.currentProject = {
            company: usefulParts[0],
            project: usefulParts[1],
            url    : document.URL
        };

        chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
            if(request.type == "DELETE_STORED_OBJECT") {
                delete self.data[request.projext];
                self.save();

                if(self.currentProject.project == request.project) {
                    self.removeFromWatchList(jQuery(".button-remove-watchlist-proj").find("a").get(0));
                }
            }
        });

        window.addEventListener("message", function(event) {
            //We only accept messages from ourselves
             if (event.source != window)
            return;

            if (event.data.type && (event.data.type == "FROM_PAGE")) {
                self.currentProject.data = event.data.project;
                self.bindWatcher();
            }

            if (event.data.type && (event.data.type == "DELETE_STORED_OBJECT")) {
                delete self.data[event.data.project];
                self.save(false);
            }

        }, false);

        self.inject();

        return self.currentProject;
    },

    bindWatcher: function() {
        var self = this;
        var el      = jQuery("#moneyraised")
                        .find("#pledge-wrap");

        var attach  = el.clone();
            attach.addClass("button-remove-watchlist-proj");
        var watched = false;
        for(var a in self.data) {
            if(typeof self.data[a] == "object" && self.data[a].project == self.currentProject.project) {
                watched = true;
            }
        }

        if(watched) {
            attach = self.generateRemoveButton(attach);
        } else {
            attach = self.generateAddButton(attach);
        }

        el.after(attach);
        if(el.parent().css("display") == "none" || el.parent().attr("style") == "display:none;") {
            attach.css({
                "margin-top":"-30px",
                "margin-bottom":"15px"}
            );
             el.parent().removeClass("show-live");
            el.parent().attr("style", "display:block !important;");
            el.parent().parent().attr("style", "display:block !important;");
            el.remove();
        }
    },

    generateAddButton: function(attach) {
        attach
            .find("a").attr({
                "href": "javascript:void(0)",
                "title": "Add to Watch List"
            })
            .html("Add to Watch List")
            .css({ "marginTop": "20px" })
            .bind("click", function(){
                kickWatcher.addToWatchList(this);
            });
        return attach;
    },

    generateRemoveButton: function(attach) {
        attach
            .find("a").attr({
                "href": "javascript:void(0)",
                "title": "Remove from Watch List"
            })
            .html("Remove from Watching")
            .css({ "marginTop": "20px" })
            .bind("click", function(){
                kickWatcher.removeFromWatchList(this);
            });
        return attach;
    },

    addToWatchList: function(button) {
        var self = this;

        self.data[self.currentProject.project] = self.currentProject;
        self.save(true);

        jQuery(button)
            .unbind("click")
            .attr("title","Remove from Watch List")
            .html("Remove from Watching")
            .bind("click", function(){
            kickWatcher.removeFromWatchList(this);
        })
    },

    removeFromWatchList: function(button) {
        var self = this;

        var data = {
            type: "DELETE_STORED_OBJECTS",
            project: self.currentProject.project
        };
        chrome.extension.sendMessage(data);

        delete self.data[self.currentProject.project];
        self.save();
        jQuery(button)
            .unbind("click")
            .attr("title","Add to Watch List")
            .html("Add to Watch List")
            .bind("click", function(){
                kickWatcher.addToWatchList(this);
        })
    },

    processMessage: function() {

    },

    init: function() {
        var self = this;
        self.load();

        chrome.extension.sendRequest({type: "GET_LOCAL_STORAGE"}, function(response) {
            if(response.data && response.data.KickUpdaterData) {
                var remoteData = JSON.parse(response.data.KickUpdaterData);
                for(var a in self.data) {
                    if(typeof remoteData[a] == "undefined") {
                        delete self.data[a];
                    }
                }
            }
            self.getProjectName();
        });

        return self;

    },

    inject: function() {
        location.href='javascript:(function(){window.postMessage({ type: "FROM_PAGE", project: window.current_project }, "*");})()';
    },

    arrayFlip: function( trans ) {
        var key, tmp_ar = {};
        for ( key in trans ){
            if ( trans.hasOwnProperty( key ) ){
                tmp_ar[trans[key]] = key;
            }
        }
        return tmp_ar;
    }
}.init();
