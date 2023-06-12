/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * @name TKIO - Copy Location
 * @version 1.0
 * @author Jair Hernandez <jair.hernandez@freebug.mx>
 * date 05/23/2023
 * This script copy de main location in transaction to location per line in item's sublist
 *
 * @copyright Tekiio 2023
 */
define(['N/record', 'N/search'], (record, search) => {

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
  */
  const afterSubmit = (scriptContext) => {
    try {
      log.audit({ title: 'scriptContext', details: scriptContext });

      const { newRecord, type } = scriptContext
      const contextApply = [scriptContext.UserEventType.CREATE, scriptContext.UserEventType.EDIT,]

      // Check the context (CREATE or EDIT) and type of transaction (PURCHASE ORDER) 
      if (contextApply.includes(type) && record.Type.PURCHASE_ORDER === newRecord.type) {

        let idRecord = (newRecord.id).toString();
        // Get the Purchase Order
        var recordPO = record.load({ type: record.Type.PURCHASE_ORDER, id: idRecord, isDynamic: true, });
        //Get the Customer and location by Requisition
        var datos = getDataByRequisition(idRecord);
        log.debug({ title: 'datos', details: datos });
        var getData = datos[0];
        var ids = datos[1];

        // Check  if the location and customer field exists in the transaction
        const mainLocation = recordPO.getValue({ fieldId: 'location' }) || '';
        const mainCustomer = recordPO.getValue({ fieldId: 'shipto' }) || '';
        const mainShipTo = recordPO.getValue({ fieldId: 'shipaddresslist' }) || '';


        const numLines = recordPO.getLineCount({ sublistId: 'item' })
        log.debug({ title: 'Data Obtain:', details: { mainCustomer: mainCustomer, mainLocation: mainLocation, mainShipTo: mainShipTo } });
        if ((mainCustomer === '' || mainLocation === '' || mainShipTo === '') && ids.some(id => id === idRecord)) {
          // If you do not have the location value, place the requisition value
          if (mainLocation === '' && getData[0].location) {
            recordPO.setValue({ fieldId: 'location', value: getData[0].location })
          }
          // If you do not have the customer value, place the requisition value
          if (mainCustomer === '' && getData[0].customer) {
            recordPO.setValue({ fieldId: 'shipto', value: getData[0].customer })
          }
          // If you do not have the 'Ship to' value, place the requisition value
          if (mainShipTo === '' && getData[0].shipto) {
            recordPO.setValue({ fieldId: 'shipaddresslist', value: getData[0].shipto })
          }

          // For the items sublist
          for (let i = 0; i < numLines; i++) {
            recordPO.selectLine({ sublistId: 'item', line: i });
            // If you do not have the location value, place the requisition value
            if (mainLocation === '' && getData[0].location) {
              recordPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: getData[0].location, })
            }
            if (mainCustomer === '' && getData[0].customer) {
              // If you do not have the customer value, place the requisition value
              recordPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'customer', value: getData[0].customer, })
            }
            recordPO.commitLine({ sublistId: 'item' });
          }
        }

        //Save the transaction
        recordPO.save({ enableSourcing: true, ignoreMandatoryFields: true });
      }

    } catch (e) {
      log.error({ title: 'Error afterSubmit:', details: e });
    }
  }
  function getDataByRequisition(idRequisition) {
    try {
      let arrPO = [];
      let idPO = [];
      var purchaserequisitionSearchObj = search.create({
        type: "purchaserequisition",
        filters:
          [
            ["type", "anyof", "PurchReq"],
            "AND",
            ["applyingtransaction.internalid", "anyof", idRequisition]
          ],
        columns:
          [
            search.createColumn({ name: "tranid", summary: "GROUP", label: "Document Number" }),
            search.createColumn({ name: "internalid", summary: "GROUP", label: "Internal ID" }),
            search.createColumn({ name: "internalid", join: "applyingTransaction", summary: "GROUP", label: "Internal ID" }),
            search.createColumn({ name: "internalid", join: "customer", summary: "GROUP", label: "Internal ID" }),
            search.createColumn({ name: "internalid", join: "location", summary: "GROUP", label: "Internal ID" }),
            search.createColumn({ name: "custcol_tkio_ship_to_line", summary: "GROUP", label: "Ship To" })
          ]
      });
      var searchResultCount = purchaserequisitionSearchObj.runPaged().count;
      log.debug("purchaserequisitionSearchObj result count", searchResultCount);
      purchaserequisitionSearchObj.run().each(function (result) {
        arrPO.push({
          idReq: result.getValue({ name: "internalid", summary: "GROUP" }),
          idPO: result.getValue({ name: "internalid", join: "applyingTransaction", summary: "GROUP" }),
          customer: parseInt(result.getValue({ name: "internalid", join: "customer", summary: "GROUP" })),
          location: parseInt(result.getValue({ name: "internalid", join: "location", summary: "GROUP" })),
          shipto: parseInt(result.getValue({ name: "custcol_tkio_ship_to_line", summary: "GROUP" }))
        })
        idPO.push(result.getValue({ name: "internalid", join: "applyingTransaction", summary: "GROUP" }))
        return true;
      });
      return [arrPO, idPO];
    } catch (e) {
      log.error({ title: 'Error :', details: e });
    }
  }
  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = scriptContext => {
    try {
      /* This code block is checking if the user event type is either CREATE or EDIT, and if
      so, it sets the value of the location field for each line in the item sublist to the
      main location value for that line. This ensures that all items in the purchase order
      have a location value assigned to them. */
      const { newRecord, type } = scriptContext
      var typeTrans = newRecord.type;
      log.debug({ title: 'tipoTrans', details: typeTrans });
      var fieldLocation, sublistLocation;
      if (typeTrans === record.Type.INVENTORY_ADJUSTMENT) {
        fieldLocation = 'adjlocation';
        sublistLocation = 'inventory';
      } else {
        fieldLocation = 'location';
        sublistLocation = 'item';
      }
      const contextApply = [
        scriptContext.UserEventType.CREATE,
        scriptContext.UserEventType.EDIT,
      ]
      if (contextApply.includes(type)) {
        /* `const mainLocation = newRecord.getValue({ fieldId: 'location' })` is obtaining
        the value of the "Location" field from the current record being edited or
        created. This value is then stored in the `mainLocation` constant variable to be
        used later in the script. */
        const mainLocation = newRecord.getValue({ fieldId: fieldLocation })
        const numLines = newRecord.getLineCount({ sublistId: sublistLocation })
        for (let i = 0; i < numLines; i++) {
          /* `newRecord.setSublistValue()` is a NetSuite API method that sets the value of a field in a
          sublist line of a record. In this specific case, it is setting the value of the "location"
          field in the "item" sublist line at index `i` to the value of `mainLocation`. This ensures
          that all items in the transaction have the same location value as the main location. */
          newRecord.setSublistValue({ sublistId: sublistLocation, fieldId: 'location', line: i, value: mainLocation, })

          if (typeTrans === 'purchaserequisition') {
            const mainCustomer = newRecord.getValue({ fieldId: 'custbody_tkio_hl_customer_contract' })
            newRecord.setSublistValue({ sublistId: sublistLocation, fieldId: 'customer', line: i, value: mainCustomer, })
          }
        }
      }
    } catch (err) {
      log.error('Error on beforeSubmit', err)
    }
  }

  return { beforeSubmit, afterSubmit }
})
