const {TestUser} = require('../index')
const {expect} = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('testing html view', function(){
    let server, user

    this.beforeEach(async function(){
        server = await FakeServer()
        user = await TestUser()
    })

    this.afterEach(async function(){
        //Close the user before the server or it will hang
        await user.close()
        await server.close()
    })

    describe('mustBeAbleTo', function(){
        describe('must find options', function(){
            it('in buttons text', async function(){
                server.setBody('<button>perform available option in button</button>')
                await user.open(server.url)
                await user.mustBeAbleTo('perform available option in button')
            })

            it('in buttons text ignoring case', async function(){
                server.setBody('<button>perform AVAILABLE option in button</button>')
                await user.open(server.url)
                await user.mustBeAbleTo('perform available OPTION in button')
            })
    
            it('in input buttons value', async function(){
                server.setBody('<input type="button" value="perform available option in button value">')
                await user.open(server.url)
                await user.mustBeAbleTo('perform available option in button value')
            })

            it('in input buttons value ignoring case', async function(){
                server.setBody('<input type="button" value="perform AVAILABLE option in button value">')
                await user.open(server.url)
                await user.mustBeAbleTo('perform available OPTION in button value')
            })
        })
    
        describe('must throw', function(){
            describe('when the option is not available because', function(){
                it('does not exist', async function(){
                    await user.open(server.url)
                    await expectToThrow(async function(){
                        await user.mustBeAbleTo('perform not existing option')
                    })
                })
    
                it('exists as input but is disabled', async function(){
                    server.setBody('<input type="button" value="perform disabled option as input" disabled>')
                    await user.open(server.url)
                    await expectToThrow(async function(){
                        await user.mustBeAbleTo('perform disabled option as input')
                    })
                })
    
                it('exists as button but is disabled', async function(){
                    server.setBody('<button disabled>perform disabled option as button</button>')
                    await user.open(server.url)
                    await expectToThrow(async function(){
                        await user.mustBeAbleTo('perform disabled option as button')
                    })
                })
            })

            it('when there are two buttons performing the same action', async function(){
                server.setBody('<button>perform action</button><button>perform action</button>')
                await user.open(server.url)
                await expectToThrow(async function(){
                    await user.mustBeAbleTo('perform action')
                })
            })

            it('when there are two inputs performing the same action', async function(){
                server.setBody('<input type="button" value="perform action"><input type="button" value="perform action">')
                await user.open(server.url)
                await expectToThrow(async function(){
                    await user.mustBeAbleTo('perform action')
                })
            })

            it('when there is a button and an input performing the same action', async function(){
                server.setBody('<input type="button" value="perform action"><button>perform action</button>')
                await user.open(server.url)
                await expectToThrow(async function(){
                    await user.mustBeAbleTo('perform action')
                })
            })
        })
    })

    describe.only('getValueFor', function(){
        describe('when the property is in a label', function(){
            it('must return the input value', async function(){
                await server.setBody(`
                    <label for="age">age</label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('age')
                expect(age).to.equal('18')
            })
            it('must ignore case to match property and label', async function(){
                await server.setBody(`
                    <label for="age">Age</label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('agE')
                expect(age).to.equal('18')
            })
            it('must ignore spaces to match property and label', async function(){
                await server.setBody(`
                    <label for="age"> age </label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('age')
                expect(age).to.equal('18')
            })  
            it('must ignore colon to match property and label', async function(){
                await server.setBody(`
                    <label for="age"> Age: </label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('age')
                expect(age).to.equal('18')
            })
            it('must work with several words', async function(){
                await server.setBody(`
                    <label for="date-of-birth"> Date of birth: </label>
                    <input type="text" id="date-of-birth" value="1987-01-23">`)
                await user.open(server.url)
                var dateOfBirth = await user.getValueFor('date of birth')
                expect(dateOfBirth).to.equal('1987-01-23')
            })
            it('must throw when the label includes the property but is not the entire word', async function(){
                await server.setBody(`
                    <label for="age"> Marriage: </label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)

                await expectToThrow('property "age" not found', async function(){
                    await user.getValueFor('age')
                })
            })
            it('must throw when the field related to the label does not exist', async function(){
                await server.setBody(`
                    <label for="notexistingField"> Age: </label>
                    <input type="text" id="age" value="18">`)
                await user.open(server.url)

                await expectToThrow('missing input field for label "Age:"', async function(){
                    await user.getValueFor('age')
                })
            })
        })
        describe('when the property is in a placeholder', function(){
            it('must return the input value', async function(){
                await server.setBody(`<input placeholder="age" type="text" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('age')
                expect(age).to.equal('18')
            })
            it('must ignore case to match property and placeholder', async function(){
                await server.setBody(`<input placeholder="Age" type="text" value="18">`)
                await user.open(server.url)
                var age = await user.getValueFor('agE')
                expect(age).to.equal('18')
            })
        })
    })
})