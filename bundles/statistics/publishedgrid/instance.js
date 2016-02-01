/**
 * @class Oskari.statistics.bundle.publishedgrid.PublishedGridBundleInstance
 *
 */
Oskari.clazz.define('Oskari.statistics.bundle.publishedgrid.PublishedGridBundleInstance',
    /**
     * @static constructor function
     */

    function () {
        this.conf = {
            sandbox: 'sandbox'
        };
        this.state = {};
    }, {
        __name: 'PublishedGrid',

        getName: function () {
            return this.__name;
        },

        init: function () {
            return null;
        },

        update: function () {},

        stop: function () {},

        start: function () {
            var me = this;
            // Do not start if we can't get the state.
            if (!me.state) {
                return;
            }
            me.gridVisible = null;
            var conf = me.conf;
            // Let's use statsgrid's locale files.
            // They are linked from the bundle.js file.
            var locale = Oskari.getLocalization('StatsGrid'),
                sandboxName = (conf ? conf.sandbox : null) || 'sandbox',
                sandbox = Oskari.getSandbox(sandboxName);
            jQuery("#contentMap")[0].style.setProperty("margin-left", "0px", "important");

            me.sandbox = sandbox;
            me.locale = locale;
            sandbox.register(me);

            sandbox.registerAsStateful(me.mediator.bundleId, me);

            // Find the map module.
            var mapModule = sandbox.findRegisteredModuleInstance('MainMapModule');
            me.mapModule = mapModule;

            // The container where the grid will be rendered to.
            var container = jQuery('<div class="publishedgrid"></div>');
            me.container = container;

            // Create the StatisticsService for handling ajax calls and common functionality.
            // Used in both plugins below.
            var statsService = Oskari.clazz.create(
                'Oskari.statistics.bundle.statsgrid.StatisticsService',
                me.sandbox
            );
            sandbox.registerService(statsService);
            me.statsService = statsService;

            var tooltipRequestHandler = Oskari.clazz.create(
                'Oskari.statistics.bundle.statsgrid.request.TooltipContentRequestHandler',
                me
            );

            sandbox.addRequestHandler(
                'StatsGrid.TooltipContentRequest',
                tooltipRequestHandler
            );

            var indicatorRequestHandler = Oskari.clazz.create(
                'Oskari.statistics.bundle.statsgrid.request.IndicatorsRequestHandler',
                me
            );
            sandbox.addRequestHandler(
                'StatsGrid.IndicatorsRequest',
                indicatorRequestHandler
            );

            // Get the stats layer.
            var statsLayer = me.sandbox.findMapLayerFromAllAvailable(me.state.layerId);
            if (!statsLayer) {
                return;
            }
            me.statsLayer = statsLayer;

            // Note that the embedded URL might have been generated by an older version of Oskari.
            // We must either make a graceful failover here, and if some newer datums are missing, we
            // must deduce some acceptable values, or guide the user to recreate the embedding URL.
            // Doing the graceful failover should be possible for all old URLs, because the old Oskari can
            // show them correctly, and hence the URL does include all necessary information if the fact
            // it has been generated by an old Oskari is taken into account.
            
            // Because old state can only come from embedded maps, we will handle migration here.
            // Otherwise we would migrate in all the respective plugins and components with state.
            if (!me.state.version) {
              // The old Oskari will not include the version info.
              // The only sources allowed are SotkaNET and user indicators.
              // The only selectors allowed are gender and year.
              // Only certain statistical region maps are allowed.
              /*
               * An example me.state constructed based on an old Oskari URL.
               * "{"colors":{"index":0,"set":"seq"},
               * "cmode":"","numberOfClasses":5,
               * "indicators":[{"id":4,"gender":"total","year":"2014"}],
               * "layerId":9,
               * "filterInput":[],"filterRegion":[],
               * "currentColumn":"indicator42014total",
               * "filterMethod":"","manualBreaksInput":"","gridShown":true,"methodId":"1",
               * "municipalities":[732,2,4,5,9,11,12,13,15,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,35,
               * ...
               * 444,445,448,449,451,452]}"
               * 
               */
              // We need to put me.selectedIndicators something like this:
              // "[{"datasourceId":"fi.nls.oskari.control.statistics.plugins.sotka.SotkaStatisticalDatasourcePlugin",
              // "indicatorId":"4","selectors":[{"selectorId":"sex","value":"total"},{"selectorId":"year","value":"2014"}],
              // "id":"fi.nls.oskari.control.statistics.plugins.sotka.SotkaStatisticalDatasourcePlugin:4:oskari:kunnat2013:{\"sex\":\"total\",\"year\":\"2014\"}"}]"
              
              me.state.selectedIndicators = me.state.indicators.map(function(indicator) {
                  if (indicator.ownIndicator) {
                    const indicatorValues = {};
                    indicator.data.forEach(function(indicatorRegionValue) {
                        var regionCode = indicatorRegionValue.region;
                        while (regionCode.length < 3) {
                            regionCode = "0" + regionCode;
                        };
                        // Note: This assumes period as the decimal separator, as per Javascript syntax.
                        indicatorValues[regionCode] = Number(indicatorRegionValue["primary value"]);
                    });
                    return {
                      // We need to add the data here because the other users do not have access to that user's private indicators.
                      "indicatorValues": indicatorValues,
                      "datasourceId":"fi.nls.oskari.control.statistics.plugins.user.UserIndicatorsStatisticalDatasourcePlugin",
                      "indicatorId": "" + indicator.id,
                      "selectors": [{
                        "selectorId":"sex",
                        "value": indicator.gender
                      },{
                        "selectorId":"year",
                        "value": indicator.year
                      }],
                      // These are localized.
                      "title": indicator.title,
                      "organizaton": indicator.organization,
                      "description": indicator.description,
                      // Cache key
                      "id": "fi.nls.oskari.control.statistics.plugins.user.UserIndicatorsStatisticalDatasourcePlugin:" + indicator.id + ":" + statsLayer._layerName +
                        ":" + '{\"sex\":\"' + indicator.gender + '\",\"year\":\"' + indicator.year + '\"}'
                    };
                  } else {
                    return {
                      "datasourceId":"fi.nls.oskari.control.statistics.plugins.sotka.SotkaStatisticalDatasourcePlugin",
                      "indicatorId": "" + indicator.id,
                      "selectors": [{
                        "selectorId":"sex",
                        "value": indicator.gender
                      },{
                        "selectorId":"year",
                        "value": indicator.year
                      }],
                      // Cache key
                      "id": "fi.nls.oskari.control.statistics.plugins.sotka.SotkaStatisticalDatasourcePlugin:" + indicator.id + ":" + statsLayer._layerName +
                        ":" + '{\"sex\":\"' + indicator.gender + '\",\"year\":\"' + indicator.year + '\"}'
                    };
                  }
              });
              
              /*
               * An example statsLayer constructed based on old Oskari URL:
               * 
               * "{"_id":9,
               * "_name":{"fi":"kunnat2013","sv":"kunnat2013","en":"kunnat2013","es":"kunnat2013"},
               * "_description":{"fi":"","sv":"","en":"","es":""},
               * "_type":"NORMAL_LAYER","_layerType":"STATS","_params":{},"_options":{},"_attributes":{},
               * "_metaType":null,"_maxScale":1,"_minScale":15000000,"_visible":true,"_opacity":100,
               * "_isSticky":null,"_inspireName":"Others","_organizationName":"Demo layers","_orderNumber":null,
               * "_subLayers":[],"_styles":[],"_currentStyle":null,"_legendImage":"","_featureInfoEnabled":null,
               * "_queryable":false,"_queryFormat":null,"_permissions":{"edit":true,"download":
               * "download_permission_ok","publish":"publication_permission_ok"},"_geometry":[],
               * "_geometryWKT":null,"_tools":[{"_name":"table_icon","_title":"Thematic maps",
               * "_tooltip":"Go to thematic maps","_iconCls":null}],"_backendStatus":null,"_featureData":false,
               * "_layerUrls":["/action?id=9&action_route=GetLayerTile"],
               * "_layerName":"oskari:kunnat2013","_baseLayerId":-1,"_realtime":false,"_refreshRate":0,
               * "_version":"1.1.0","_srs_name":"EPSG:3067","_admin":{"username":"admin","inspireId":37,
               * "organizationId":1,"capabilities":{},"password":"geoserver",
               * "url":"http://localhost:8080/geoserver/oskari/wfs"},"_gfiContent":null,
               * "_created":"2015-12-03T13:07:00.000Z","admin":{"username":"admin","inspireId":37,
               * "organizationId":1,"capabilities":{},"password":"geoserver",
               * "url":"http://localhost:8080/geoserver/oskari/wfs"}}"
               */
            } else if (me.state.version == 2) {
              // Current version.
            } else {
              console.log("Warning! This embedded URL has been generated by a newer Oskari. Update the Oskari deployment.");
            }
            
            var gridConf = {
                'published': true,
                'state': me.state,
                'layer': statsLayer
            };

            //if classification not explicitly allowed, don't allow it.
            //This will however also change the behaviour of existing published maps where classification has previously been allowed.
            //Those maps need to be manually updated in order to get the classifying back in action.
            var state = me.getState();
            if (!me.conf || (me.conf && !me.conf.allowClassification)) {
                state.allowClassification = false;
            }

            // Register classification plugin to the map.
            var classifyPlugin = Oskari.clazz.create(
                'Oskari.statistics.bundle.statsgrid.plugin.ManageClassificationPlugin',
                {
                    'state': state
                },
                locale
            );
            mapModule.registerPlugin(classifyPlugin);
            mapModule.startPlugin(classifyPlugin);
            me.classifyPlugin = classifyPlugin;

            var statsLayerPlugin = sandbox.findRegisteredModuleInstance(
                'MainMapModuleStatsLayerPlugin'
            );
            if (statsLayerPlugin) {
                // A sort of a hack to enable the hover and select controls in a published map.
                statsLayerPlugin._modeVisible = true;
            }

            // We need to notify the grid of the current state
            // so it can load the right indicators.
            //this.gridPlugin.setState(this.state);
            this.classifyPlugin.setState(this.state);
            // Reset the classify plugin
            this.classifyPlugin.resetUI(this.state);

            me.createUI();
        },

        setState: function (state) {
          // This is unnecessary here.
        },

        getState: function () {
            return this.state;
        },

        /**
         * Get state parameters.
         * Returns string with statsgrid state. State value keys are before the '-' separator and
         * the indicators are after the '-' separator. The indicators are further separated by ',' and
         * both state values and indicator values are separated by '+'.
         * Note that we're returning the state even when there's no view.
         *
         * @method getStateParameters
         * @return {String} statsgrid state
         */
        getStateParameters: function () {
            var me = this,
                state = me.state;

            // If the state is null or an empty object, nothing to do here!
            if (!state || jQuery.isEmptyObject(state)) {
                return null;
            }

            var i = null,
                len = null,
                last = null,
                statsgridState = 'statsgrid=',
                valueSeparator = '+',
                indicatorSeparator = ',',
                stateValues = null,
                indicatorValues = null,
                colorsValues = null,
                colors = state.colors || {},
                keys = [
                    'layerId',
                    'currentColumn',
                    'methodId',
                    'numberOfClasses',
                    'classificationMode',
                    'manualBreaksInput',
                    'allowClassification'
                ],
                colorKeys = ['set', 'index', 'flipped'],
                indicators = state.selectedIndicators || [],
                value;
            // Note! keys needs to be handled in the backend as well.
            // Therefore the key order is important as well as actual values.
            // 'classificationMode' can be an empty string but it must be the
            // fifth value.
            // 'manualBreaksInput' can be an empty string but it must be the
            // sixth value.
            for (i = 0, len = keys.length, last = len - 1; i < len; i += 1) {
                value = state[keys[i]];
                if (value !== null && value !== undefined) {
                    // skip undefined and null
                    stateValues += value;
                }
                if (i !== last) {
                    stateValues += valueSeparator;
                }
            }

            // handle indicators separately
            for (i = 0, len = indicators.length, last = len - 1; i < len; i += 1) {
                indicatorValues += indicators[i].id;
                indicatorValues += valueSeparator;
                var first = true;
                indicators[i].selectors.forEach(function(selector) {
                  if (!first) {
                    indicatorValues += valueSeparator;
                  }
                  indicatorValues += selector.name;
                  indicatorValues += valueSeparator;
                  indicatorValues += selector.value;
                  first = false;
                });
                indicatorValues += valueSeparator;
                if (i !== last) {
                    indicatorValues += indicatorSeparator;
                }
            }

            // handle colors separately
            var colorArr = [],
                cKey;

            colors.flipped = colors.flipped === true;
            for (i = 0, len = colorKeys.length; i < len; i += 1) {
                cKey = colorKeys[i];
                if (colors.hasOwnProperty(cKey) && colors[cKey] !== null && colors[cKey] !== undefined) {
                    colorArr.push(colors[cKey]);
                }
            }
            if (colorArr.length === 3) {
                colorsValues = colorArr.join(',');
            }

            var ret = null;
            if (stateValues && indicatorValues) {
                ret = statsgridState + stateValues + '-' + indicatorValues + '-';
                if (colorsValues) {
                    ret += colorsValues;
                }
                ret += '-1'; // always enable mode
            }

            return ret;
        },
        "getMainPanel" : function() {
            var me = this;
            if(!this.__mainPanel) {
                this.__mainPanel = Oskari.clazz.create('Oskari.statistics.bundle.statsgrid.view.MainPanel', this,
                    me.locale,
                    me.sandbox, true, me.state, me.statsLayer);
            }
            return this.__mainPanel;
        },
        /**
         * @method createUI
         * Creates the UI based on the given state (what indicators to use and so on).
         */
        createUI: function () {
            var me = this;
            me.mainPanel = me.getMainPanel();

            // Makes some room in the DOM for the grid.
            me._toggleGrid(me.state.gridShown);

            // don't print this if there is no grid to be shown
            if (me.state.gridShown) {
                // Create the show/hide toggle button for the grid.
                me._createShowHideButton(me.container);
            }
            // Initialize the grid
            me.mainPanel.render(me.container);
            me._adjustDataContainer();
            me.sendTooltipData = function(feature) {
                me.mainPanel.sendTooltipData(feature);
            };
        },

        /**
         * Gets the instance sandbox.
         *
         * @method getSandbox
         * @return {Object} return the sandbox associated with this instance
         */
        getSandbox: function () {
            return this.sandbox;
        },

        isLayerVisible: function () {
            var ret = false,
                layer = this.sandbox.findMapLayerFromSelectedMapLayers(this.state.layerId);
            if (layer) {
                ret = true;
            }
            return ret;
        },

        /**
         * Returns the open indicators of the instance's grid plugin.
         *
         * @method getGridIndicators
         * @return {Object/null} returns the open indicators of the grid plugin, or null if no grid plugin
         */
        getGridIndicators: function () {
          // FIXME: Implement or remove
          return null;
        },

        /**
         * @method _toggleGrid
         * @param {Boolean} show Shows the grid when true, hides it when false
         */
        _toggleGrid: function (show) {
            var me = this,
                elCenter = jQuery('.oskariui-center'), // the map column
                elLeft = jQuery('.oskariui-left'); // the grid column

            elCenter.toggleClass('span12', !show);
            elLeft.toggleClass('oskari-closed', !show);

            if (show) {
                elLeft.html(me.container);
            } else {
                if (!elLeft.is(':empty')) {
                    elLeft.remove(me.container);
                }
            }

            me.gridVisible = show;

            me._updateMapModuleSize();
        },

        /**
         * Creates a button to show/hide the grid.
         *
         * @method _createShowHideButton
         * @param {Object} elementToHide The element the button should hide.
         */
        _createShowHideButton: function (elementToHide) {
            var me = this,
                button = jQuery(
                    '<div id="publishedgridToggle" class="oskariui mapplugin hidePublishedGrid" data-clazz="Oskari.statistics.bundle.publishedgrid.PublishedGridBundleInstance"></div>'
                );

            button.click(function (event) {
                event.preventDefault();

                if (me.gridVisible) {
                    me.gridVisible = false;
                    jQuery(elementToHide).hide({
                        duration: 50,
                        complete: function () {
                            me._adjustDataContainer();
                        }
                    });
                    jQuery(this).removeClass('hidePublishedGrid').addClass('showPublishedGrid');
                } else {
                    me.gridVisible = true;
                    jQuery(elementToHide).show({
                        duration: 50,
                        complete: function () {
                            me._adjustDataContainer();
                        }
                    });
                    jQuery(this).removeClass('showPublishedGrid').addClass('hidePublishedGrid');
                }
            });

            me.mapModule.setMapControlPlugin(button, 'top left', 1);
        },

        _updateMapModuleSize: function () {
            var sandbox = Oskari.getSandbox('sandbox'),
                reqBuilder = sandbox.getRequestBuilder(
                    'MapFull.MapSizeUpdateRequest'
                );

            if (reqBuilder) {
                sandbox.request(this, reqBuilder());
            }
        },

        /**
         * @private @method _adjustDataContainer
         * This horrific thing is what sets the statsgrid, container and map size.
         */
        _adjustDataContainer: function () {
            /*
            Structure:
            - content
                - dataContainer
                    - grid
                - mapContainer
                    - mapDiv
            */
            var me = this,
                mapDiv = this.mapModule.getMapEl(),
                content = jQuery('#contentMap'),
                container = content.find('.row-fluid'),
                dataContainer = container.find('.oskariui-left'),
                gridWidth = me._calculateGridWidth(),
                gridHeight = 0,
                mapContainer = container.find('.oskariui-center'),
                mapWidth,
                mapHeight,
                totalWidth = content.width(),
                totalHeight = content.height();

            dataContainer.toggleClass('oskari-closed', !me.gridVisible);

            if (me.gridVisible) {
                gridHeight = totalHeight;
                dataContainer.show();
            } else {
                gridWidth = 0;
            }

            mapWidth = (totalWidth - gridWidth) + 'px';
            mapHeight = totalHeight + 'px';
            gridWidth = gridWidth + 'px';
            gridHeight = gridHeight + 'px';

            dataContainer.css({
                'width': gridWidth,
                'height': gridHeight,
                'float': 'left'
            }).addClass('published-grid-left');

            mapDiv.css({
                'width': mapWidth,
                'height': mapHeight
            });

            mapContainer.css({
                'width': mapWidth,
                'height': mapHeight,
                'float': 'left'
            }).addClass('published-grid-center');

            if (me.container) {
                me.container.height(mapHeight);
            }

            // notify map module that size has changed
            me._updateMapModuleSize();
        },

        /**
         * @private @method _calculateGridWidth
         * Calculates a sensible width for statsgrid (but doesn't set it...)
         */
        _calculateGridWidth: function () {
            var sandbox = Oskari.getSandbox('sandbox'),
                columns,
                statsGrid = sandbox.getStatefulComponents().statsgrid, // get state of statsgrid
                width = 160;

            if (this.state &&
                this.state.selectedIndicators !== null &&
                this.state.selectedIndicators !== undefined) {

                //indicators + municipality (name & code)
                columns = this.state.selectedIndicators.length + 2;
                //slickgrid column width is 80 by default
                width = columns * 80;
            }
            // Width + scroll bar width, but 400 at most.
            return Math.min((width + 20), 400);
        }
    }, {
        protocol: [
            'Oskari.bundle.BundleInstance',
            'Oskari.mapframework.module.Module'
        ]
    });
