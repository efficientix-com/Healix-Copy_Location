/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
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

define(['N/record'], (record) => {
  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  const validateLine = scriptContext => {
    try {
      /* `const { currentRecord, sublistId } = scriptContext` is using destructuring assignment to
    extract the `currentRecord` and `sublistId` properties from the `scriptContext` object and
    assign them to constants with the same names. This allows for easier and more concise access
    to these properties later in the code. */
      const { currentRecord, sublistId } = scriptContext
      if (sublistId === 'item') {
        const mainLocation = currentRecord.getValue({ fieldId: 'location' })
        const mainLocation_txt = currentRecord.getText({ fieldId: 'location' })
        log.debug('lineInit ~ mainLocation:', mainLocation)
        log.debug('lineInit ~ mainLocation_txt:', mainLocation_txt)
        /* It is setting the value of the "location" field in
        the current sublist line to the value of the "location" field in the main record. The
        `sublistId` parameter specifies the sublist name, `fieldId` specifies the field name,
        `value` specifies the value to be set, and `ignoreFieldChange` specifies whether to trigger
        field change events. */
        currentRecord.setCurrentSublistValue({
          sublistId: sublistId,
          fieldId: 'location',
          value: mainLocation,
          ignoreFieldChange: false,
        })
      }
      return true
    } catch (err) {
      log.error('Error on validateLine', err)
    }
    return true
  }

  const lineInit = scriptContext => {
    try {
      const {currentRecord, sublistId} = scriptContext;
      const {type} = currentRecord;
      if(record.Type.INVENTORY_ADJUSTMENT === type && sublistId === 'inventory') {
        const mainLocation = currentRecord.getValue({fieldId: 'adjlocation'})
        log.debug({title:'mainLocation', details:mainLocation});
        if (mainLocation) {
          currentRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'location',
            value: mainLocation,
            ignoreFieldChange: false
          });
        }
      }
    } catch (err) {
      log.error({title:'lineInit', details:err});
    }
  }

  return {
    validateLine,
    lineInit
  }
})
