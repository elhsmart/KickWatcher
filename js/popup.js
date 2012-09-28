KickUpdaterPopup = {

    bind: function() {
        var self = this;
        jQuery(".template-generated").remove();
        self.projectCounter = 0;
        self.projects       = {};
        if(localStorage.KickUpdaterData) {
            self.projects = JSON.parse(localStorage.KickUpdaterData);
            for(var name in self.projects) {
                self.projectCounter++;
                var project = self.projects[name];
                template    = self.generateTemplate(self.projects[name].data, name, project);
            }
        }
        if(self.projectCounter == 0) {
            jQuery(".empty-holder").css("display","block");
        }
    },

    removeFromWatched: function(event) {
        var projects = JSON.parse(localStorage.KickUpdaterData);
        var projName = jQuery(event.srcElement).attr("project");
        delete projects[projName];
        delete localStorage.removedProjects;
        localStorage.KickUpdaterData = JSON.stringify(projects);
        var removedProjects = [];
        if(typeof localStorage.removedProjects != "undefined"){
            removedProjects = JSON.parse(localStorage.removedProjects);
        }

        localStorage.removedProjects = JSON.stringify(removedProjects.push(projName));


        chrome.tabs.getAllInWindow(undefined, function(tabs) {
            for (var i = 0, tab; tab = tabs[i]; i++) {
                if (tab.url && tab.url.indexOf("www.kickstarter.com") > 0) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: "DELETE_STORED_OBJECT",
                        project: projName
                    });
                }
            }
        });
        localStorage.KickUpdaterData = JSON.stringify(projects);
        KickUpdaterPopup.bind();
    },

    removeUpdated: function(proj, tmpl) {
        var projects = JSON.parse(localStorage.KickUpdaterData);
        delete projects[proj.project].isUpdated;
        delete projects[proj.project].data.isUpdated;

        chrome.browserAction.getBadgeText({}, function(badgeText){
            tmpl.find(".updated").removeClass("updated").addClass("stable");
            tmpl.find(".project-card").unbind("click.removeUpdated");
            if(!isNaN(parseInt(badgeText)-1)) {
                if((parseInt(badgeText)-1) == 0) {
                    chrome.browserAction.setBadgeText({text: ""});
                } else {
                    chrome.browserAction.setBadgeText({text: (parseInt(badgeText)-1).toString()});
                }
            } else {
                chrome.browserAction.setBadgeText({text: ""});
            }
        });
        localStorage.KickUpdaterData = JSON.stringify(projects);
    },

    generateTemplate: function(data, name, project) {
        var tmpl = jQuery(".template")
            .clone();

        if(project.isUpdated) {
            tmpl.find(".project-card").bind("click.removeUpdated", function(){
                KickUpdaterPopup.removeUpdated(project, tmpl);
            });
        }
        tmpl.removeClass("template");

        tmpl.find("#company-name").html("");
        if(data.creator && data.creator.name) {
            tmpl.find("#company-name").html(data.creator.name);
        }

        tmpl.find("#project-description").html("");
        if(data.blurb) {
            tmpl.find("#project-description").html(data.blurb);
        }

        tmpl.find("#project-link").html("");
        if(data.name) {
            tmpl.find("#project-link").html(data.name);
        }

        tmpl.find(".projectphoto-little").attr("src", "");
        if(data.photo && data.photo.little) {
            tmpl.find(".projectphoto-little").attr("src", data.photo.little);
        }

        var percentage = parseInt(data.pledged) / (parseInt(data.goal)/100);
        tmpl.find(".project-stats").find(".funded").find("strong").html(parseInt(percentage)+"%");

        if(data.state == "successful") {
            tmpl.find(".project-pledged-successful").css({
                "display": "block",
                "width": "170px",
                "margin-left":"10px",
                "border-radius":"10px",
                "text-align":"center"
            });
            tmpl.find(".project-pledged-wrap").remove();
        } else if(data.state == "failed") {
            tmpl.find(".project-pledged-wrap").remove();
            tmpl.find(".project-failed").css({
                "display":"block"
            });
            tmpl.find(".project-stats").remove();
        } else {
            if(percentage > 100) {
                tmpl.find(".project-pledged").css("width", "100%");
            } else {
                tmpl.find(".project-pledged").css("width", percentage+"%");
            }
        }

        tmpl.find(".project-stats").find(".pledged").find("strong").html("$"+number_format(parseInt(data.pledged), 0, ".", ","));


        if(data.state == "successful") {
            var d = new Date(data.updated_at*1000);
            tmpl.find(".project-stats").find(".ksr_page_timer").find("strong").html("FUNDED");
            tmpl.find(".project-stats").find(".ksr_page_timer").find("div").html(d.toString("MMM dd, yyyy"));
        } else if(data.state == "failed") {

            var d = new Date(data.updated_at*1000);
            tmpl.find("#end-date").html(d.toString("dd/mm/yyyy"));

        } else {
            var wordToGo = "days to go";
            var timeToGo = (data.deadline - data.updated_at);
            // Days?
            if(timeToGo / (3600*24) < 3) {
                timeToGo = parseInt(timeToGo / (3600))
                wordToGo = "hours to go";
            } else {
                timeToGo = parseInt(timeToGo / (3600*24));
            }

            tmpl.find(".project-stats").find(".ksr_page_timer").find("strong").html(timeToGo);
            tmpl.find(".project-stats").find(".ksr_page_timer").find("div").html(wordToGo);
        }

        var url = "http://www.kickstarter.com" + data.latestUpdateUrl;
        var removeButtonId = "button-remove-"+name;
        tmpl.find(".button-remove").attr({
            "id": removeButtonId,
            "project": name
        }).addClass(removeButtonId);

        tmpl.find(".button-remove").get(0).addEventListener("click", function(e){
            KickUpdaterPopup.removeFromWatched(e);
        });

        tmpl.find(".button-visit").attr({"href": url, target:"_blank"});
        tmpl.find(".latest-update").html(data.latestUpdateTitle);

        tmpl.attr({
            class:"project template-generated",
            style:"width:500px; height:230px !important;"
        });

        tmpl.find(".updates-count").html(project.updatesCount);
        if(project.isUpdated) {
            tmpl.find(".updates-count").addClass("updated");
        } else {
            tmpl.find(".updates-count").addClass("stable");
        }

        jQuery("#project-holder").append(tmpl);
    },

    init: function() {
        var self = this;
        jQuery(document).ready(function(){
            self.bind();
        })
        return self;
    }
}.init();

function number_format( number, decimals, dec_point, thousands_sep ) {	// Format a number with grouped thousands
    //
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +	 bugfix by: Michael White (http://crestidg.com)

    var i, j, kw, kd, km;

    // input sanitation & defaults
    if( isNaN(decimals = Math.abs(decimals)) ){
        decimals = 2;
    }
    if( dec_point == undefined ){
        dec_point = ",";
    }
    if( thousands_sep == undefined ){
        thousands_sep = ".";
    }

    i = parseInt(number = (+number || 0).toFixed(decimals)) + "";

    if( (j = i.length) > 3 ){
        j = j % 3;
    } else{
        j = 0;
    }

    km = (j ? i.substr(0, j) + thousands_sep : "");
    kw = i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands_sep);
    //kd = (decimals ? dec_point + Math.abs(number - i).toFixed(decimals).slice(2) : "");
    kd = (decimals ? dec_point + Math.abs(number - i).toFixed(decimals).replace(/-/, 0).slice(2) : "");


    return km + kw + kd;
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-35165638-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();