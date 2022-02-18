import cors from 'cors';
import express from 'express';
import {db} from './db';

const app = express();

app.use(express.static('static'));
app.use(cors());

app.get('/:identifier/get', async (request, response) => {
	const {identifier} = request.params;
	const connection = await db();
	const channel = await connection.channel.findOne({
		identifier,
	});
	if (!channel) {
		response.end('0');
		return;
	}

	response.end(String(channel.value));
});

app.get('/:identifier', async (request, response) => {
	const {identifier} = request.params;
	const connection = await db();
	const channel = await connection.channel.findOneAndUpdate(
		{
			identifier,
		},
		{
			$inc: {
				value: 1,
				howManyTimesIncremented: 1,
			}
		},
		{
			upsert: true,
			returnDocument: 'after',
		}
	);
	response.end(String(channel.value?.value));
});

app.get('/:identifier/set/:numberstr', async (request, response) => {
	const {identifier, numberstr} = request.params;
	const num = parseInt(numberstr, 10);
	if (typeof num !== 'number' || isNaN(num)) {
		response
			.status(400)
			.end(
				'Must set to a number. Example: increment.build/my-awesome-app/set/1154'
			);
		return;
	}

	const connection = await db();
	const channel = await connection.channel.findOne({
		identifier,
	});
	if (!channel) {
		await connection.channel.insertOne({
			identifier,
			howManyTimesIncremented: 1,
			value: num,
		});
		return response.end(String(num));
	}

	if (num <= channel.value) {
		response
			.status(400)
			.end('You cannot decrease the number. Use another identifier instead.');
		return;
	}

	await connection.channel.updateOne(
		{
			identifier,
		},
		{
			$inc: {
				howManyTimesIncremented: 1,
			},
			$set: {
				value: num,
			},
		}
	);
	return response.end(String(num));
});

app.use(async (request, response) => {
	response
		.status(404)
		.end(
			'You cannot include a slash in your identifier.\nTry without one, for example increment.build/my-awesome-app'
		);
});

app.listen(process.env.PORT || 8000);
console.log('App started on port 8000');
