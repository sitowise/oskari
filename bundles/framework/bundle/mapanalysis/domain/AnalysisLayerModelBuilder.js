/*
 * @class Oskari.mapframework.bundle.mapanalysis.domain.AnalysisLayerModelBuilder
 * JSON-parsing for analysis layer
 */
Oskari.clazz.define('Oskari.mapframework.bundle.mapanalysis.domain.AnalysisLayerModelBuilder', function(sandbox) {
	this.localization = Oskari.getLocalization("MapAnalysis");
    this.sandbox = sandbox;
    this.wfsBuilder = Oskari.clazz.create('Oskari.mapframework.bundle.mapwfs2.domain.WfsLayerModelBuilder');
}, {
	/**
	 * parses any additional fields to model
	 * @param {Oskari.mapframework.bundle.mapanalysis.domain.AnalysisLayer} layer partially populated layer
	 * @param {Object} mapLayerJson JSON presentation of the layer
	 * @param {Oskari.mapframework.service.MapLayerService} maplayerService not really needed here
	 */
	parseLayerData : function(layer, mapLayerJson, maplayerService) {
        var me = this;

        // call parent parseLayerData
        this.wfsBuilder.parseLayerData(layer, mapLayerJson, maplayerService);

		if(mapLayerJson.fields){
			layer.setFields(mapLayerJson.fields);
		}
		if(mapLayerJson.name){
			layer.setName(mapLayerJson.name);	
		}
		if (mapLayerJson.wpsName) {
			layer.setWpsName(mapLayerJson.wpsName);
		}
		if (mapLayerJson.wpsUrl) {
			layer.setWpsUrl(mapLayerJson.wpsUrl);
		}
		if (mapLayerJson.wpsLayerId) {
			layer.setWpsLayerId(mapLayerJson.wpsLayerId);
		}
	}
});
