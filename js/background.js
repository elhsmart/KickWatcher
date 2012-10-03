KickUpdater = {

    data: {},
    stats: {},
    IntervalMin: 5,
    IntervalMax: 60,
    requestTimerId: 0,
    oldChromeVersion: !chrome.runtime,

    options: function() {
        return JSON.parse(localStorage.KickWatcherOptions);
    },

    save: function() {
        localStorage.KickUpdaterData = JSON.stringify(KickUpdater.data);
        localStorage.KickUpdaterStats = JSON.stringify(KickUpdater.stats);
    },

    load: function() {
        if(localStorage.KickUpdaterData) {
            KickUpdater.data = JSON.parse(localStorage.KickUpdaterData);
        }
        if(localStorage.KickUpdaterStats) {
            KickUpdater.stats = JSON.parse(localStorage.KickUpdaterStats);
        }
    },

    bindUpdaters: function() {
        var self = this;
        if(self.oldChromeVersion) {
            self.updateIcon();
        } else {
            chrome.alarms.onAlarm.addListener(self.onAlarm);
        }

        if (!self.oldChromeVersion) {
            chrome.alarms.create('watchdog', {periodInMinutes:5});
            self.startRequest({scheduleRequest:true, KickUpdater: self});
        }

        chrome.extension.onMessage.addListener(function(message) {
            self.processMessage(message);
        });

        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            if (request.type == "GET_LOCAL_STORAGE") {
                sendResponse({data: localStorage});
            } else {
                sendResponse({}); // snub them.
            }
        });
    },

    processMessage: function(message) {
        var getInfo = false;
        switch(message.type) {
            case "UPDATE_STORED_OBJECTS": {
                getInfo = false;
                for(var a in message.data) {
                    if(typeof KickUpdater.data[a] == "undefined") {
                        getInfo = true;
                    }
                    KickUpdater.data[a] = message.data[a];
                }
                KickUpdater.save();
                break;
            }
            case "RELOAD_OBJECTS": {
                KickUpdater.load();
                break;
            }
            case "DELETE_STORED_OBJECTS": {
                delete KickUpdater.data[message.project];
                KickUpdater.save();
                break;
            }
        }
        if(getInfo) {
            KickUpdater.startRequest({scheduleRequest:false});
        }
    },

    startRequest: function(params) {
        var project = null;
        var URL     = "http://www.kickstarter.com/projects/";
        if (params && params.scheduleRequest) {
            if(params.KickUpdater) {
                params.KickUpdater.scheduleRequest();
            } else {
                KickUpdater.scheduleRequest();
            }
        }
        KickUpdater.load();
        for(var a in KickUpdater.data) {
            project = KickUpdater.data[a];

            (function(project){
                jQuery.ajax({
                    type    : "GET",
                    url     : URL+project.company+"/"+project.project,
                    success :function(data, status, xhr) {
                        KickUpdater.updateProjectStats(project.project, project, data)
                    }
                })
            })(project);
        }
    },

    updateProjectStats: function(id, project, data) {

        var self = this,
            updatesRegex  = /\<span data-updates-count=\"(\d{1,})\" id=\"updates_count\"\>/,
            res           = updatesRegex.exec(data),
            updatesCount  = parseInt(res[1]);

        var dataRegex     = /\/\/\<\!\[CDATA\[[\n\r{0,}](.*)/gi
            res           = dataRegex.exec(data);
        var newProjectData= JSON.parse(res[1].replace(" window.current_project =", ""));

        self.data[id].data = newProjectData;
        self.save();

        if(typeof self.data[id].data.latestUpdateTitle == "undefined") {
            (function(id, project, updatesCount){
                self.updateProjectUpdates(id, project, updatesCount);
            })(id, project, updatesCount);
        }
    },

    updateProjectUpdates: function(id, project, updatesCount) {
        var URL     = "http://www.kickstarter.com/projects/";
        var self    = this;

        jQuery.ajax({
            type    : "GET",
            url     : URL+project.company+"/"+project.project+"/posts",
            success :function(data, status, xhr) {
                updateRegex = /\<h2 class\=\"title\"\>\n\<a href=\"([^\"]{1,})\"\>([^\<]{1,})\</gi
                updates = updateRegex.exec(data);
                if(updates) {
                    KickUpdater.data[id].data.latestUpdateUrl   = updates[1];
                    KickUpdater.data[id].data.latestUpdateTitle = updates[2];
                    KickUpdater.save();
                }

                if(!KickUpdater.data[id].updatesCount) {
                    KickUpdater.data[id].updatesCount = updatesCount;
                    KickUpdater.save();
                    return;
                }

                if(KickUpdater.data[id].updatesCount == updatesCount) {
                    return;
                }

                if(updatesCount > KickUpdater.data[id].updatesCount) {
                    if(!KickUpdater.data[id].isUpdated) {
                        KickUpdater.updateIcon(updatesCount - KickUpdater.data[id].updatesCount);
                    }

                    if(self.options().USE_NOTIFICATIONS) {
                        var notification = webkitNotifications.createNotification(
                            chrome.extension.getURL('images/Icon-Small-48.png'),
                            KickUpdater.data[id].data.name+" just Updated!",
                            KickUpdater.data[id].data.latestUpdateTitle
                        );

                        notification.show();
                    }

                    KickUpdater.data[id].updatesCount = updatesCount;
                    KickUpdater.data[id].isUpdated = true;
                    KickUpdater.save();
                }
            }
        })
    },

    scheduleRequest: function() {

        var randomness  = Math.random() * 2;
        var exponent    = Math.pow(2, localStorage.requestFailureCount || 0);
        var multiplier  = Math.max(randomness * exponent, 1);
        var delay       = Math.min(multiplier * KickUpdater.IntervalMin, KickUpdater.IntervalMax);
        //delay           = Math.round(delay);


        if (KickUpdater.oldChromeVersion) {
            if (KickUpdater.requestTimerId) {
                window.clearTimeout(requestTimerId);
            }
            requestTimerId = window.setTimeout(KickUpdater.onAlarm, delay*60*1000);
        } else {
            chrome.alarms.create('refresh', {periodInMinutes: delay});
        }
    },

    onAlarm: function(alarm) {
        if (alarm && alarm.name == 'watchdog') {
            KickUpdater.onWatchdog();
        } else {
            setTimeout(function(){
                KickUpdater.startRequest({scheduleRequest:true});
            }, 10);

        }
    },

    onWatchdog: function() {
        chrome.alarms.get('refresh', function(alarm) {
            if (alarm) {
            } else {
                setTimeout(function(){
                    KickUpdater.startRequest({scheduleRequest:true});
                }, 10);

            }
        });
    },


    updateIcon: function(counter) {
        var self = this;
        chrome.browserAction.getBadgeText({}, function(badgeText){
            self.updateBadgeText(counter,badgeText);
        });
    },

    updateBadgeText: function(counter, text) {
        var self = this;
        if(text.length == 0) {
            chrome.browserAction.setBadgeText({text: counter.toString()});
            return;
        }

        counter = counter + parseInt(text);
        chrome.browserAction.setBadgeText({text: counter.toString()});
        return;
    },

    init: function() {
        var self = this;
        window.KickUpdater = self;
        self.load();
        self.bindUpdaters();
        return self;
    }
}.init();