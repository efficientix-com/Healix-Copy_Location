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
define(['N/record'], (record) => {
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
      log.debug({title:'tipoTrans', details:typeTrans});
      var fieldLocation, sublistLocation;
      if (typeTrans === record.Type.INVENTORY_ADJUSTMENT) {
        fieldLocation = 'adjlocation';
        sublistLocation = 'inventory';
      }else{
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
          newRecord.setSublistValue({
            sublistId: sublistLocation,
            fieldId: 'location',
            line: i,
            value: mainLocation,
          })
        }
      }
    } catch (err) {
      log.error('Error on beforeSubmit', err)
    }
  }

  return { beforeSubmit }
})
