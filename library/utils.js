
//Request ID
let uniqueID = 0;

module.exports = {

    // Random id generator
    getUniqueID () {
        uniqueID ++;
        return uniqueID.toString();
    }

}