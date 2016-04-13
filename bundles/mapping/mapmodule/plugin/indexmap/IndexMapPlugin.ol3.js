/**
 * @class Oskari.mapframework.bundle.mapmodule.plugin.IndexMapPlugin
 *
 * Provides indexmap functionality for map. Uses image from plugin resources as the index map.
 *
 */
Oskari.clazz.define(
    'Oskari.mapframework.bundle.mapmodule.plugin.IndexMapPlugin',

    /**
     * @static @method create called automatically on construction
     *
     * @param {Object} config
     *      JSON config with params needed to run the plugin
     *
     */
    function (config) {
        var me = this;
        me._clazz =
            'Oskari.mapframework.bundle.mapmodule.plugin.IndexMapPlugin';
        me._defaultLocation = 'bottom right';
        me._index = 5;
        me._name = 'IndexMapPlugin';
        me._indexMap = null;
        me._indElement = null;
        // FIXME a more generic filename or get it from config...
        //SAMI
        me._indexMapUrl = '/Oskari/bundles/mapping/mapmodule/resources/images/suomi25m_tm35fin.png';
    },
    {
        /**
         * @private @method _createControlElement
         * Constructs/initializes the indexmap  control for the map.
         *
         *
         * @return {jQuery} element
         */
        _createControlElement: function () {
            /* overview map */
            var me = this,
                conf = me.getConfig(),
                el;

            if (conf.containerId) {
                el = jQuery('#' + conf.containerId);
            } else {
                el = jQuery('<div class="mapplugin indexmap"></div>');
            }

            return el;
        },

        /**
         * @private @method _createControlAdapter
         * Constructs/initializes the control adapter for the plugin
         *
         * @param {jQuery} el
         *
         */
        _createControlAdapter: function (el) {
            // FIXME this seems to be completely FI-specific?
            /*
             * create an overview map control with non-default
             * options
             */
            var me = this;
            // initialize control, pass container
            me._indexMap = new ol.control.OverviewMap();
            me._indexMap.setCollapsed(true);

            // Ol indexmap target
            me._indElement = jQuery('<div class="mapplugin ol_indexmap"></div>');
            me.getElement().append(me._indElement);

            return me._indexMap;
        },

        refresh: function () {
            var me = this,
                toggleButton = me.getElement().find('.indexmapToggle');
            if (!toggleButton.length) {
                toggleButton = jQuery('<div class="indexmapToggle"></div>');
                // button has to be added separately so the element order is correct...
                me.getElement().append(toggleButton);
            }
            // add toggle functionality to button
            me._bindIcon(toggleButton);
        },

        _bindIcon: function (icon) {
            var me = this;

            icon.unbind('click');
            icon.bind('click', function (event) {

                //Add index map control - remove old one
                if (me._indexMap.getCollapsed()) {
                    // get/Set only base layer to index map
                    var layer = me._getBaseLayer();

                    var extent = [26783, 6608595, 852783, 7787250];

                    var graphic =  new ol.layer.Image({
                       source: new ol.source.ImageStatic({
                            //imageSize: [120, 173],
                            url: me._indexMapUrl,
                            //projection: me.getMap().getView().getProjection(),
                            imageExtent: extent
                       })
                    });
                    if (layer) {
                        var controlOptions = {
                            target: me._indElement[0],
                            layers: [graphic],
                            view: new ol.View({
                                center: [423936, 7188480],
                                projection: me.getMap().getView().getProjection(),
                                zoom: 0
                            })
                        };
                        console.log(me._indexMap);
                        // initialize control, pass container
                        me.getMapModule().removeMapControl(me._name, me._indexMap);
                        me._indexMap = new ol.control.OverviewMap(controlOptions);
                        me._indexMap.setCollapsible(true);
                        me.getMapModule().addMapControl(me._name, me._indexMap);

                    }
                    me._indexMap.setCollapsed(false);
                }

                else {
                    me._indexMap.setCollapsed(true);
                }

            });
        },

        /**
         * @method _createEventHandlers
         * Create eventhandlers.
         *
         *
         * @return {Object.<string, Function>} EventHandlers
         */
        _createEventHandlers: function () {
            var me = this;

            return {
                AfterMapMoveEvent: function (event) {
                    if (me._indexMap && (event.getCreator() !== me.getClazz())) {
                        me._indexMap.render();
                    }
                }
            };
        },

        _setLayerToolsEditModeImpl: function () {
            var icon = this.getElement().find('.indexmapToggle');

            if (this.inLayerToolsEditMode()) {
                // close map
                var miniMap = this.getElement().find(
                    '.olControlOverviewMapElement'
                );
                miniMap.hide();
                // disable icon
                icon.unbind('click');
            } else {
                // enable icon
                this._bindIcon(icon);
            }
        },
        /**
         * Get 1st visible bottom layer
         * @returns {*}
         * @private
         */
        _getBaseLayer: function () {
            var layer = null;
            for (var i = 0; i < this._map.getLayers().getLength(); i += 1) {
                layer = this._map.getLayers().item(i);
                if(layer.getVisible()){
                    return layer;
                }
            }
            return null;
        }
    },
    {
        extend: ['Oskari.mapping.mapmodule.plugin.BasicMapModulePlugin'],
        /**
         * @static @property {string[]} protocol array of superclasses
         */
        protocol: [
            'Oskari.mapframework.module.Module',
            'Oskari.mapframework.ui.module.common.mapmodule.Plugin'
        ]
    }
);